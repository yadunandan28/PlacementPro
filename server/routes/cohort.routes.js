const express      = require("express");
const router       = express.Router();
const asyncHandler = require("express-async-handler");
const { Cohort, Module } = require("../models/Cohort");
const Question   = require("../models/Question");
const Analytics  = require("../models/Analytics");
const User       = require("../models/User");
const { protect, staffOnly } = require("../middleware/auth");

// GET all cohorts
router.get("/", protect, asyncHandler(async (req, res) => {
  const cohorts = await Cohort.find({ isActive: true }).select("-modules").lean();
  res.json({ success: true, data: { cohorts } });
}));

// ── ASSESSMENT ROUTES (must be before /:slug and /:cohortId routes) ──
// GET /api/cohorts/assessment/:subject
router.get("/assessment/:subject", protect, asyncHandler(async (req, res) => {
  const subjectMap = { os: "OS", dbms: "DBMS", cn: "CN" };
  const subject    = subjectMap[req.params.subject.toLowerCase()];
  if (!subject) return res.status(400).json({ success: false, message: "Invalid subject. Use: os, dbms, cn" });

  const questions = await Question.find({ type: "mcq", subject, isActive: true })
    .select("title description type difficulty options points subject topic")
    .sort({ _id: 1 })
    .lean();

  const analytics    = await Analytics.findOne({ user: req.user._id }).lean();
  const scoreField   = { OS: "osScore", DBMS: "dbmsScore", CN: "cnScore" };
  const previousScore = analytics?.[scoreField[subject]] || 0;

  // Prevent 304 browser caching — question order must always be fresh
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.json({ success: true, data: { subject, questions, previousScore, questionCount: questions.length } });
}));

// POST /api/cohorts/assessment/:subject/submit
router.post("/assessment/:subject/submit", protect, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const subjectMap  = { os: "OS", dbms: "DBMS", cn: "CN" };
  const subject     = subjectMap[req.params.subject.toLowerCase()];
  if (!subject) return res.status(400).json({ success: false, message: "Invalid subject" });

  // Ensure answers is always an array
  const answersArr = Array.isArray(answers) ? answers : [];

  // DEBUG: log what we receive
  console.log("🔍 SUBMIT received answersArr:", JSON.stringify(answersArr.slice(0,2)));
  console.log("🔍 answersArr length:", answersArr.length);

  // Extract question IDs from the submitted answers (frontend sends them in display order)
  const submittedIds = answersArr.map(a => a.questionId).filter(Boolean);
  console.log("🔍 submittedIds:", submittedIds.slice(0,2));

  let questions;
  if (submittedIds.length > 0) {
    // Fetch questions IN THE EXACT ORDER the frontend had them (by submitted IDs)
    const allQuestions = await Question.find({ _id: { $in: submittedIds }, type: "mcq", subject, isActive: true })
      .select("options points").lean();
    // Re-sort to match frontend order using submitted IDs
    const qMap = {};
    allQuestions.forEach(q => { qMap[q._id.toString()] = q; });
    questions = submittedIds.map(id => qMap[id]).filter(Boolean);
  } else {
    // Fallback: fetch by DB order
    questions = await Question.find({ type: "mcq", subject, isActive: true })
      .select("options points").sort({ _id: 1 }).lean();
  }

  let totalPoints = 0, earnedPoints = 0;
  const gradedAnswers = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    // Positional match — questions are now in same order as frontend answers
    const answer       = answersArr[i];
    const correctIndex = question.options.findIndex(o => o.isCorrect);
    const selected     = (answer && answer.selectedOption !== undefined) ? Number(answer.selectedOption) : -1;
    const isCorrect    = selected === correctIndex;
    const pts          = question.points || 10;
    totalPoints  += pts;
    if (isCorrect) earnedPoints += pts;
    gradedAnswers.push({ questionId: question._id, selectedOption: selected, correctOption: correctIndex, isCorrect, points: isCorrect ? pts : 0 });
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  const subjectScoreField   = { OS: "osScore",    DBMS: "dbmsScore",    CN: "cnScore"    };
  const subjectAttemptField = { OS: "osAttempts", DBMS: "dbmsAttempts", CN: "cnAttempts" };

  let analytics = await Analytics.findOne({ user: req.user._id });
  if (!analytics) analytics = await Analytics.create({ user: req.user._id });

  const currentScore = analytics[subjectScoreField[subject]] || 0;
  analytics[subjectScoreField[subject]]   = Math.max(currentScore, score);
  analytics[subjectAttemptField[subject]] = (analytics[subjectAttemptField[subject]] || 0) + 1;
  analytics.recalculateOverall();
  await analytics.save();

  res.json({
    success: true,
    data: {
      score, earnedPoints, totalPoints, gradedAnswers,
      isNewBest: score > currentScore,
      previousBest: currentScore,
      message: score === 100 ? "Perfect score! 🎉"
        : score >= 70 ? `Great job! ${score}% 🟢`
        : score >= 40 ? `${score}% — Keep practicing! 🟡`
        : `${score}% — Review the material and try again 🔴`,
    },
  });
}));

// ── MODULE ROUTES ─────────────────────────────────────────
router.get("/modules/:moduleId/questions", protect, asyncHandler(async (req, res) => {
  const module = await Module.findById(req.params.moduleId).populate({
    path: "questions", match: { isActive: true, type: "mcq" },
    select: "title description type difficulty options points subject topic",
  });
  if (!module) return res.status(404).json({ success: false, message: "Module not found" });
  res.json({ success: true, data: { module: { _id: module._id, title: module.title, minPassScore: module.minPassScore }, questions: module.questions } });
}));

router.post("/modules/:moduleId/submit", protect, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const answersArr  = Array.isArray(answers) ? answers : [];
  const module = await Module.findById(req.params.moduleId).populate({
    path: "questions", match: { type: "mcq" }, select: "options points subject",
  });
  if (!module) return res.status(404).json({ success: false, message: "Module not found" });

  const alreadyCompleted = req.user.completedModules?.some(id => id.toString() === req.params.moduleId);
  let totalPoints = 0, earnedPoints = 0;
  const gradedAnswers = [];

  for (const question of module.questions) {
    const answer       = answersArr.find(a => a.questionId === question._id.toString());
    const correctIndex = question.options.findIndex(o => o.isCorrect);
    const selected     = answer ? Number(answer.selectedOption) : -1;
    const isCorrect    = selected === correctIndex;
    const pts          = question.points || 10;
    totalPoints += pts;
    if (isCorrect) earnedPoints += pts;
    gradedAnswers.push({ questionId: question._id, selectedOption: selected, correctOption: correctIndex, isCorrect, points: isCorrect ? pts : 0 });
  }

  const score  = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= module.minPassScore;

  let analytics = await Analytics.findOne({ user: req.user._id });
  if (!analytics) analytics = await Analytics.create({ user: req.user._id });

  const existingIdx = analytics.moduleScores.findIndex(ms => ms.module?.toString() === module._id.toString());
  if (existingIdx >= 0) {
    if (score > analytics.moduleScores[existingIdx].score) {
      analytics.moduleScores[existingIdx].score = score;
      analytics.moduleScores[existingIdx].passedAt = new Date();
    }
  } else {
    analytics.moduleScores.push({ module: module._id, score, passedAt: new Date() });
  }

  if (passed && !alreadyCompleted) {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { completedModules: module._id } });
    if (!analytics.modulesCompleted.includes(module._id)) analytics.modulesCompleted.push(module._id);
  }

  analytics.recalculateOverall();
  await analytics.save();

  res.json({ success: true, data: { score, passed, minPassScore: module.minPassScore, earnedPoints, totalPoints, gradedAnswers,
    message: passed ? `Passed with ${score}%! 🔓` : `Score: ${score}%. Need ${module.minPassScore}% to pass.` } });
}));

// ── COHORT ROUTES (parameterized — must come AFTER named routes) ──
router.get("/:cohortId/modules", protect, asyncHandler(async (req, res) => {
  const modules = await Module.find({ cohort: req.params.cohortId, isActive: true })
    .sort({ order: 1 }).select("title description order resources").lean();
  res.json({ success: true, data: { modules } });
}));

router.get("/:slug", protect, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findOne({ slug: req.params.slug }).populate({
    path: "modules", match: { isActive: true }, options: { sort: { order: 1 } },
    select: "title description order resources minPassScore",
  });
  if (!cohort) return res.status(404).json({ success: false, message: "Cohort not found" });
  res.json({ success: true, data: { cohort } });
}));

// STAFF
router.post("/", protect, staffOnly, asyncHandler(async (req, res) => {
  const cohort = await Cohort.create(req.body);
  res.status(201).json({ success: true, data: { cohort } });
}));
router.post("/:cohortId/modules", protect, staffOnly, asyncHandler(async (req, res) => {
  const module = await Module.create({ cohort: req.params.cohortId, ...req.body });
  await Cohort.findByIdAndUpdate(req.params.cohortId, { $push: { modules: module._id } });
  res.status(201).json({ success: true, data: { module } });
}));

module.exports = router;