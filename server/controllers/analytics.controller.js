const Analytics  = require("../models/Analytics");
const User       = require("../models/User");
const Submission = require("../models/Submission");
const { Cohort, Module } = require("../models/Cohort");

// ── STUDENT: my analytics ─────────────────────────────────
const getMyAnalytics = async (req, res) => {
  let analytics = await Analytics.findOne({ user: req.user._id })
    .populate("cohort",              "name slug icon")
    .populate("modulesCompleted",    "title order")
    .populate("moduleScores.module", "title order");
  if (!analytics) analytics = await Analytics.create({ user: req.user._id });
  res.json({ success: true, data: { analytics } });
};

// ── STAFF: platform overview ──────────────────────────────
const getPlatformOverview = async (req, res) => {
  const totalStudents = await User.countDocuments({ role: "student" });

  const cohortBreakdown = await User.aggregate([
    { $match: { role:"student", cohort:{ $ne:null } } },
    { $group: { _id:"$cohort", count:{ $sum:1 } } },
    { $lookup:{ from:"cohorts", localField:"_id", foreignField:"_id", as:"cohortInfo" } },
    { $unwind:"$cohortInfo" },
    { $project:{ cohortName:"$cohortInfo.name", count:1 } },
  ]);

  const avgScores = await Analytics.aggregate([
    { $group:{
      _id:null,
      avgDSA:     { $avg:"$dsaScore"    },
      avgDBMS:    { $avg:"$dbmsScore"   },
      avgOS:      { $avg:"$osScore"     },
      avgCN:      { $avg:"$cnScore"     },
      avgOverall: { $avg:"$overallScore" },
    }},
  ]);

  const atRisk = await Analytics.aggregate([
    { $match:{ overallScore:{ $gt:0 } } },
    { $bucket:{
      groupBy:"$overallScore",
      boundaries:[0,30,50,70,101],
      default:"other",
      output:{ count:{ $sum:1 } },
    }},
  ]);

  const subjectAtRisk = await Analytics.aggregate([
    { $match:{ overallScore:{ $gt:0 } } },
    { $group:{
      _id:null,
      dsaWeak:  { $sum:{ $cond:[{ $and:[{ $gt:["$dsaScore",0]  },{ $lt:["$dsaScore",50]  }]},1,0] } },
      osWeak:   { $sum:{ $cond:[{ $and:[{ $gt:["$osScore",0]   },{ $lt:["$osScore",50]   }]},1,0] } },
      dbmsWeak: { $sum:{ $cond:[{ $and:[{ $gt:["$dbmsScore",0] },{ $lt:["$dbmsScore",50] }]},1,0] } },
      cnWeak:   { $sum:{ $cond:[{ $and:[{ $gt:["$cnScore",0]   },{ $lt:["$cnScore",50]   }]},1,0] } },
    }},
  ]);

  const needsAttention    = await Analytics.countDocuments({ overallScore:{ $gt:0, $lt:50 } });
  const sevenDaysAgo      = new Date(Date.now() - 7*24*60*60*1000);
  const recentSubmissions = await Submission.countDocuments({ createdAt:{ $gte:sevenDaysAgo } });

  res.json({
    success:true,
    data:{
      totalStudents, needsAttention, recentSubmissions, cohortBreakdown,
      avgScores:     avgScores[0] || { avgDSA:0, avgDBMS:0, avgOS:0, avgCN:0, avgOverall:0 },
      atRiskBuckets: atRisk,
      subjectAtRisk: subjectAtRisk[0] || { dsaWeak:0, osWeak:0, dbmsWeak:0, cnWeak:0 },
    },
  });
};

// ── STAFF: all students — ensures every student is shown ──
const getAllStudentsAnalytics = async (req, res) => {
  const { cohort, department, search, page=1, limit=100 } = req.query;

  // Build user filter
  const userFilter = { role:"student" };
  if (cohort)     userFilter.cohort     = cohort;
  if (department) userFilter.department = department;
  if (search) {
    userFilter.$or = [
      { name:       { $regex:search, $options:"i" } },
      { email:      { $regex:search, $options:"i" } },
      { rollNumber: { $regex:search, $options:"i" } },
    ];
  }

  // Get ALL matching students
  const allStudents = await User.find(userFilter)
    .select("_id name email department rollNumber cgpa cohort")
    .populate("cohort","name icon")
    .lean();

  if (allStudents.length === 0) {
    return res.json({ success:true, data:{ students:[], pagination:{ total:0, page:1, totalPages:0 } } });
  }

  const userIds = allStudents.map(u => u._id);

  // Get existing analytics docs
  const existingAnalytics = await Analytics.find({ user:{ $in:userIds } })
    .populate("cohort",            "name icon")
    .populate("modulesCompleted",  "title")
    .populate("moduleScores.module","title")
    .lean();

  const analyticsMap = {};
  for (const a of existingAnalytics) {
    analyticsMap[a.user.toString()] = a;
  }

  // Auto-create missing analytics docs (bulk)
  const missingUserIds = userIds.filter(id => !analyticsMap[id.toString()]);
  if (missingUserIds.length > 0) {
    const toCreate = missingUserIds.map(uid => {
      const user = allStudents.find(u => u._id.toString() === uid.toString());
      return { user: uid, cohort: user?.cohort?._id || user?.cohort || null };
    });
    try {
      const newDocs = await Analytics.insertMany(toCreate, { ordered: false });
      for (const doc of newDocs) analyticsMap[doc.user.toString()] = doc;
    } catch { /* ignore duplicate key errors */ }
  }

  // Merge: for every student, return their analytics (or a zero-score placeholder)
  const merged = allStudents.map(user => {
    const uid = user._id.toString();
    const analytics = analyticsMap[uid];
    if (analytics) {
      // Attach populated user info
      return {
        ...analytics,
        user: { _id:user._id, name:user.name, email:user.email, department:user.department, rollNumber:user.rollNumber, cgpa:user.cgpa },
        cohort: analytics.cohort || user.cohort,
      };
    }
    // Placeholder for student with no analytics yet
    return {
      _id: uid + "_placeholder",
      user: { _id:user._id, name:user.name, email:user.email, department:user.department, rollNumber:user.rollNumber, cgpa:user.cgpa },
      cohort: user.cohort,
      dsaScore:0, osScore:0, dbmsScore:0, cnScore:0, overallScore:0,
      modulesCompleted:[], moduleScores:[], codePassed:0,
    };
  });

  // Sort by overallScore desc
  merged.sort((a, b) => (b.overallScore||0) - (a.overallScore||0));

  const skip  = (Number(page)-1) * Number(limit);
  const total = merged.length;
  const students = merged.slice(skip, skip + Number(limit));

  res.json({ success:true, data:{ students, pagination:{ total, page:Number(page), totalPages:Math.ceil(total/Number(limit)) } } });
};

// ── STAFF: single student detail ─────────────────────────
const getStudentDetail = async (req, res) => {
  let analytics = await Analytics.findOne({ user:req.params.studentId })
    .populate("user",              "name email department rollNumber cgpa")
    .populate("cohort",            "name icon")
    .populate("modulesCompleted",  "title order")
    .populate("moduleScores.module","title order")
    .lean();

  if (!analytics) {
    // Create one on the fly
    analytics = await Analytics.create({ user:req.params.studentId });
    analytics = await Analytics.findById(analytics._id)
      .populate("user","name email department rollNumber cgpa")
      .lean();
  }

  const codeSubmissions = await Submission.find({ user:req.params.studentId, type:"coding" })
    .populate("question","title difficulty topic").sort({ createdAt:-1 }).limit(20).lean();
  const mcqSubmissions  = await Submission.find({ user:req.params.studentId, type:"mcq" })
    .populate("question","title subject difficulty").sort({ createdAt:-1 }).lean();

  res.json({ success:true, data:{ analytics, codeSubmissions, mcqSubmissions } });
};

// ── STAFF: export CSV ─────────────────────────────────────
const exportReport = async (req, res) => {
  const { cohort, department } = req.query;
  const userFilter = { role:"student" };
  if (cohort)     userFilter.cohort     = cohort;
  if (department) userFilter.department = department;

  const allStudents = await User.find(userFilter)
    .select("_id name email department rollNumber cgpa cohort")
    .populate("cohort","name").lean();

  const userIds    = allStudents.map(u => u._id);
  const analytics  = await Analytics.find({ user:{ $in:userIds } })
    .populate("moduleScores.module","title").lean();
  const analyticsMap = {};
  for (const a of analytics) analyticsMap[a.user.toString()] = a;

  const headers = [
    "Name","Email","Roll No","Department","CGPA","Cohort",
    "DSA Score","OS Score","DBMS Score","CN Score","Overall Score",
    "Modules Completed","Code Solved","Easy","Medium","Hard","Module Quiz Scores",
  ];

  const rows = allStudents.map(u => {
    const a = analyticsMap[u._id.toString()] || {};
    const moduleStr = (a.moduleScores||[]).map(ms=>`${ms.module?.title||"?"}:${ms.score||0}%`).join(" | ");
    return [
      u.name||"", u.email||"", u.rollNumber||"",
      `"${u.department||""}"`, u.cgpa||0,
      `"${u.cohort?.name||"Not selected"}"`,
      a.dsaScore||0, a.osScore||0, a.dbmsScore||0, a.cnScore||0, a.overallScore||0,
      (a.modulesCompleted||[]).length, a.codePassed||0,
      a.easyPassed||0, a.mediumPassed||0, a.hardPassed||0,
      `"${moduleStr}"`,
    ].join(",");
  });

  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="KCT_Placement_${Date.now()}.csv"`);
  res.send([headers.join(","), ...rows].join("\n"));
};

const getCohortAnalytics = async (req, res) => {
  const users   = await User.find({ role:"student", cohort:req.params.cohortId }).select("_id").lean();
  const userIds = users.map(u=>u._id);
  const data    = await Analytics.find({ user:{ $in:userIds } })
    .populate("user","name email department rollNumber cgpa").lean();
  data.sort((a,b)=>b.overallScore-a.overallScore);
  res.json({ success:true, data:{ students:data, topStudents:data.slice(0,5) } });
};

module.exports = { getMyAnalytics, getPlatformOverview, getCohortAnalytics, getAllStudentsAnalytics, getStudentDetail, exportReport };