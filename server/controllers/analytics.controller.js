// ============================================================
//  controllers/analytics.controller.js
// ============================================================

const Analytics  = require("../models/Analytics");
const User       = require("../models/User");
const Submission = require("../models/Submission");
const { Cohort, Module } = require("../models/Cohort");

// ── STUDENT: Get my analytics ─────────────────────────────
const getMyAnalytics = async (req, res) => {
  let analytics = await Analytics.findOne({ user: req.user._id })
    .populate("cohort",           "name slug icon")
    .populate("modulesCompleted", "title order")
    .populate("moduleScores.module", "title order");

  if (!analytics) analytics = await Analytics.create({ user: req.user._id });
  res.json({ success: true, data: { analytics } });
};

// ── STAFF: Platform overview ──────────────────────────────
const getPlatformOverview = async (req, res) => {
  const totalStudents = await User.countDocuments({ role: "student" });

  const cohortBreakdown = await User.aggregate([
    { $match: { role: "student", cohort: { $ne: null } } },
    { $group: { _id: "$cohort", count: { $sum: 1 } } },
    { $lookup: { from: "cohorts", localField: "_id", foreignField: "_id", as: "cohortInfo" } },
    { $unwind: "$cohortInfo" },
    { $project: { cohortName: "$cohortInfo.name", cohortSlug: "$cohortInfo.slug", count: 1 } },
  ]);

  const avgScores = await Analytics.aggregate([
    { $group: {
      _id: null,
      avgDSA:     { $avg: "$dsaScore"    },
      avgDBMS:    { $avg: "$dbmsScore"   },
      avgOS:      { $avg: "$osScore"     },
      avgCN:      { $avg: "$cnScore"     },
      avgOverall: { $avg: "$overallScore" },
    }},
  ]);

  const needsAttention    = await Analytics.countDocuments({ overallScore: { $gt: 0, $lt: 50 } });
  const sevenDaysAgo      = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSubmissions = await Submission.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

  res.json({
    success: true,
    data: {
      totalStudents, needsAttention, recentSubmissions, cohortBreakdown,
      avgScores: avgScores[0] || { avgDSA: 0, avgDBMS: 0, avgOS: 0, avgCN: 0, avgOverall: 0 },
    },
  });
};

// ── STAFF: All students with full details ─────────────────
const getAllStudentsAnalytics = async (req, res) => {
  const { cohort, department, search, page = 1, limit = 50 } = req.query;

  const userFilter = { role: "student" };
  if (cohort)     userFilter.cohort     = cohort;
  if (department) userFilter.department = department;
  if (search) {
    userFilter.$or = [
      { name:       { $regex: search, $options: "i" } },
      { email:      { $regex: search, $options: "i" } },
      { rollNumber: { $regex: search, $options: "i" } },
    ];
  }

  const users   = await User.find(userFilter).select("_id").lean();
  const userIds = users.map(u => u._id);

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Analytics.countDocuments({ user: { $in: userIds } });

  const data = await Analytics.find({ user: { $in: userIds } })
    .populate("user",   "name email department rollNumber cgpa cohort")
    .populate("cohort", "name slug icon")
    .populate("modulesCompleted", "title order")
    .populate("moduleScores.module", "title order")
    .sort({ overallScore: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({
    success: true,
    data: {
      students: data,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) },
    },
  });
};

// ── STAFF: Single student detail ──────────────────────────
const getStudentDetail = async (req, res) => {
  const { studentId } = req.params;

  const analytics = await Analytics.findOne({ user: studentId })
    .populate("user",   "name email department rollNumber cgpa cohort")
    .populate("cohort", "name icon")
    .populate("modulesCompleted",    "title order")
    .populate("moduleScores.module", "title order")
    .lean();

  if (!analytics) return res.status(404).json({ success: false, message: "Student not found" });

  // Get their code submissions
  const codeSubmissions = await Submission.find({ user: studentId, type: "coding" })
    .populate("question", "title difficulty topic")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Get MCQ submissions grouped by subject
  const mcqSubmissions = await Submission.find({ user: studentId, type: "mcq" })
    .populate("question", "title subject difficulty")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: { analytics, codeSubmissions, mcqSubmissions },
  });
};

// ── STAFF: Export CSV ─────────────────────────────────────
const exportReport = async (req, res) => {
  const { cohort, department } = req.query;

  const userFilter = { role: "student" };
  if (cohort)     userFilter.cohort     = cohort;
  if (department) userFilter.department = department;

  const users   = await User.find(userFilter).select("_id").lean();
  const userIds = users.map(u => u._id);

  const data = await Analytics.find({ user: { $in: userIds } })
    .populate("user",   "name email department rollNumber cgpa")
    .populate("cohort", "name")
    .populate("modulesCompleted",    "title")
    .populate("moduleScores.module", "title")
    .lean();

  // Build CSV with module scores included
  const headers = [
    "Name", "Email", "Roll No", "Department", "CGPA", "Cohort",
    "DSA Score", "DBMS Score", "OS Score", "CN Score", "Overall Score",
    "Modules Completed", "Code Problems Solved", "Code Pass Rate",
    "Easy Solved", "Medium Solved", "Hard Solved",
    "Module Quiz Scores",
  ];

  const rows = data.map(row => {
    const moduleScoreStr = (row.moduleScores || [])
      .map(ms => `${ms.module?.title || "Unknown"}:${ms.score}%`)
      .join(" | ");

    const codePassRate = row.totalCodeSubmissions > 0
      ? Math.round((row.codePassed / row.totalCodeSubmissions) * 100) + "%"
      : "0%";

    return [
      row.user?.name              || "",
      row.user?.email             || "",
      row.user?.rollNumber        || "",
      `"${row.user?.department   || ""}"`,
      row.user?.cgpa              || 0,
      `"${row.cohort?.name       || "Not selected"}"`,
      row.dsaScore                || 0,
      row.dbmsScore               || 0,
      row.osScore                 || 0,
      row.cnScore                 || 0,
      row.overallScore            || 0,
      row.modulesCompleted?.length || 0,
      row.codePassed              || 0,
      codePassRate,
      row.easyPassed              || 0,
      row.mediumPassed            || 0,
      row.hardPassed              || 0,
      `"${moduleScoreStr}"`,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="kct_placement_report_${Date.now()}.csv"`);
  res.send(csv);
};

// ── Cohort analytics ──────────────────────────────────────
const getCohortAnalytics = async (req, res) => {
  const { cohortId } = req.params;
  const users    = await User.find({ role: "student", cohort: cohortId }).select("_id").lean();
  const userIds  = users.map(u => u._id);

  const data = await Analytics.find({ user: { $in: userIds } })
    .populate("user", "name email department rollNumber cgpa")
    .lean();

  data.sort((a, b) => b.overallScore - a.overallScore);
  const count = data.length || 1;

  const totals = data.reduce((acc, cur) => ({
    dsa: acc.dsa + cur.dsaScore, dbms: acc.dbms + cur.dbmsScore,
    os:  acc.os  + cur.osScore,  cn:   acc.cn   + cur.cnScore,
    overall: acc.overall + cur.overallScore,
  }), { dsa: 0, dbms: 0, os: 0, cn: 0, overall: 0 });

  res.json({
    success: true,
    data: {
      students:     data,
      topStudents:  data.slice(0, 5),
      weakStudents: [...data].reverse().slice(0, 5),
      averages: {
        dsa:     Math.round(totals.dsa     / count),
        dbms:    Math.round(totals.dbms    / count),
        os:      Math.round(totals.os      / count),
        cn:      Math.round(totals.cn      / count),
        overall: Math.round(totals.overall / count),
      },
    },
  });
};

module.exports = {
  getMyAnalytics, getPlatformOverview, getCohortAnalytics,
  getAllStudentsAnalytics, getStudentDetail, exportReport,
};