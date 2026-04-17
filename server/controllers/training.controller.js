const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Analytics = require("../models/Analytics");
const TrainingCampaign = require("../models/TrainingCampaign");
const TrainingEnrollment = require("../models/TrainingEnrollment");
const { parsePdfBuffer } = require("../utils/jdPdf.util");
const {
  extractFocusAreas,
  generatePreparationPlan,
} = require("../services/jdAi.service");

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

function buildReasons(studentSkills, keywordMatches, weakAreas) {
  const reasons = [];
  if (keywordMatches.length)
    reasons.push(`Skills aligned: ${keywordMatches.slice(0, 4).join(", ")}`);
  if (weakAreas.length)
    reasons.push(`Needs support in: ${weakAreas.join(", ")}`);
  if (!reasons.length && studentSkills.length)
    reasons.push("General profile relevance");
  return reasons.slice(0, 2);
}

async function matchStudentsForJD(focusAreas) {
  const students = await User.find({ role: "student", isActive: true })
    .select("_id name email rollNumber skills cohort")
    .populate("cohort", "name icon")
    .lean();

  if (!students.length) return [];
  const analytics = await Analytics.find({
    user: { $in: students.map((s) => s._id) },
  })
    .select("user dsaScore osScore dbmsScore cnScore overallScore")
    .lean();
  const analyticsMap = {};
  analytics.forEach((a) => {
    analyticsMap[String(a.user)] = a;
  });

  const focusTokens = Array.from(
    new Set(focusAreas.flatMap((f) => tokenize(f))),
  );

  const ranked = students.map((student) => {
    const skills = (student.skills || []).map((s) => s.toLowerCase());
    const skillTokens = skills.flatMap((s) => tokenize(s));
    const matchedTokens = Array.from(
      new Set(skillTokens.filter((t) => focusTokens.includes(t))),
    );
    let score = matchedTokens.length * 18;

    const a = analyticsMap[String(student._id)] || {};
    const weak = [];
    if ((a.dsaScore || 0) > 0 && a.dsaScore < 50) weak.push("DSA");
    if ((a.osScore || 0) > 0 && a.osScore < 50) weak.push("OS");
    if ((a.dbmsScore || 0) > 0 && a.dbmsScore < 50) weak.push("DBMS");
    if ((a.cnScore || 0) > 0 && a.cnScore < 50) weak.push("CN");
    score += weak.length * 8;
    if ((a.overallScore || 0) > 0 && a.overallScore < 55) score += 6;

    return {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        cohort: student.cohort,
      },
      matchScore: Math.min(100, score),
      reasons: buildReasons(skills, matchedTokens, weak),
    };
  });

  const filtered = ranked.filter((r) => r.matchScore > 0);
  const pool = filtered.length
    ? filtered
    : ranked.map((r) => ({
        ...r,
        matchScore: 30,
        reasons: ["General training relevance"],
      }));
  return pool.sort((a, b) => b.matchScore - a.matchScore).slice(0, 30);
}

const uploadStaffJD = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No PDF file uploaded" });
  }
  if (!process.env.GROQ_API_KEY) {
    return res
      .status(503)
      .json({ success: false, message: "AI service not configured on server" });
  }

  const extractedText = await parsePdfBuffer(req.file.buffer);
  if (!extractedText || extractedText.trim().length < 50) {
    return res
      .status(400)
      .json({ success: false, message: "PDF appears empty or image-only." });
  }

  const focusAreas = await extractFocusAreas(extractedText);
  const plan = await generatePreparationPlan(extractedText, focusAreas);
  const matched = await matchStudentsForJD(focusAreas);

  const campaign = await TrainingCampaign.create({
    createdBy: req.user._id,
    originalName: req.file.originalname,
    extractedText,
    focusAreas,
    roleSummary: plan.roleSummary || "",
    timelineWeeks: plan.timelineWeeks || 4,
    phases: plan.phases || [],
    interviewTips: plan.interviewTips || [],
    topicsToDrill: plan.topicsToDrill || [],
    matchedStudents: matched.map((m) => ({
      student: m.student._id,
      matchScore: m.matchScore,
      reasons: m.reasons,
      assigned: false,
    })),
  });

  const payload = await TrainingCampaign.findById(campaign._id)
    .populate("matchedStudents.student", "name email rollNumber cohort")
    .populate("matchedStudents.student.cohort", "name icon")
    .lean();

  res.status(201).json({ success: true, data: { campaign: payload } });
});

const listStaffCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await TrainingCampaign.find({ createdBy: req.user._id })
    .sort({ createdAt: -1 })
    .populate("matchedStudents.student", "name email rollNumber cohort")
    .populate("matchedStudents.student.cohort", "name icon")
    .lean();
  res.json({ success: true, data: { campaigns } });
});

const assignCampaign = asyncHandler(async (req, res) => {
  const campaign = await TrainingCampaign.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  }).populate("matchedStudents.student", "name");
  if (!campaign)
    return res
      .status(404)
      .json({ success: false, message: "Campaign not found" });

  const requestedIds =
    Array.isArray(req.body?.studentIds) && req.body.studentIds.length
      ? req.body.studentIds.map(String)
      : campaign.matchedStudents.map((m) =>
          String(m.student?._id || m.student),
        );

  if (!requestedIds.length) {
    return res
      .status(400)
      .json({ success: false, message: "No students selected to assign" });
  }

  let assignedNow = 0;
  for (const m of campaign.matchedStudents) {
    const sid = String(m.student?._id || m.student);
    if (!requestedIds.includes(sid)) continue;
    await TrainingEnrollment.updateOne(
      { campaign: campaign._id, student: sid },
      {
        $setOnInsert: {
          campaign: campaign._id,
          student: sid,
          assignedBy: req.user._id,
          title: `Training: ${campaign.originalName}`,
          roleSummary: campaign.roleSummary,
          focusAreas: campaign.focusAreas,
          timelineWeeks: campaign.timelineWeeks,
          phases: campaign.phases.map((p) => ({
            title: p.title,
            summary: p.summary,
            goals: p.goals || [],
            resources: p.resources || [],
            tasks: (p.tasks || []).map((t) => ({
              title: t.title,
              detail: t.detail,
              estimatedHours: t.estimatedHours || 2,
              done: false,
            })),
          })),
          interviewTips: campaign.interviewTips || [],
          topicsToDrill: campaign.topicsToDrill || [],
          notificationTitle: "New roadmap assigned by staff",
          notificationText: `${campaign.originalName} training roadmap has been assigned to you.`,
          notificationRead: false,
        },
      },
      { upsert: true },
    );
    if (!m.assigned) {
      m.assigned = true;
      assignedNow += 1;
    }
  }

  campaign.assignedCount = campaign.matchedStudents.filter(
    (m) => m.assigned,
  ).length;
  await campaign.save();
  res.json({
    success: true,
    message: `Assigned to ${assignedNow} students`,
    data: { assignedNow, assignedTotal: campaign.assignedCount },
  });
});

const getMyTrainings = asyncHandler(async (req, res) => {
  const enrollments = await TrainingEnrollment.find({ student: req.user._id })
    .sort({ createdAt: -1 })
    .select("-__v")
    .lean();
  const unreadCount = enrollments.filter((e) => !e.notificationRead).length;
  res.json({ success: true, data: { enrollments, unreadCount } });
});

const updateTrainingTask = asyncHandler(async (req, res) => {
  const { enrollmentId, phaseId, taskId } = req.params;
  const done = Boolean(req.body?.done);
  const enrollment = await TrainingEnrollment.findOne({
    _id: enrollmentId,
    student: req.user._id,
  });
  if (!enrollment)
    return res
      .status(404)
      .json({ success: false, message: "Training not found" });
  const phase = enrollment.phases.id(phaseId);
  if (!phase)
    return res.status(404).json({ success: false, message: "Phase not found" });
  const task = phase.tasks.id(taskId);
  if (!task)
    return res.status(404).json({ success: false, message: "Task not found" });

  task.done = done;
  const total = enrollment.phases.reduce(
    (sum, p) => sum + (p.tasks || []).length,
    0,
  );
  const completed = enrollment.phases.reduce(
    (sum, p) => sum + (p.tasks || []).filter((t) => t.done).length,
    0,
  );
  enrollment.status =
    completed === 0
      ? "enrolled"
      : completed === total
        ? "completed"
        : "in_progress";
  await enrollment.save();
  res.json({ success: true, data: { enrollment } });
});

const markTrainingNotificationRead = asyncHandler(async (req, res) => {
  const enrollment = await TrainingEnrollment.findOneAndUpdate(
    { _id: req.params.enrollmentId, student: req.user._id },
    { notificationRead: true },
    { new: true },
  );
  if (!enrollment)
    return res
      .status(404)
      .json({ success: false, message: "Training not found" });
  res.json({ success: true, data: { enrollment } });
});

module.exports = {
  uploadStaffJD,
  listStaffCampaigns,
  assignCampaign,
  getMyTrainings,
  updateTrainingTask,
  markTrainingNotificationRead,
};
