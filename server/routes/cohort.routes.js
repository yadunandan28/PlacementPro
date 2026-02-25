// routes/cohort.routes.js
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

// GET one cohort by slug
router.get("/:slug", protect, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findOne({ slug: req.params.slug }).populate({
    path: "modules", match: { isActive: true },
    options: { sort: { order: 1 } },
    select: "title description order resources minPassScore",
  });
  if (!cohort) return res.status(404).json({ success: false, message: "Cohort not found" });
  res.json({ success: true, data: { cohort } });
}));

// GET modules for a cohort with student progress
router.get("/:cohortId/modules", protect, asyncHandler(async (req, res) => {
  const modules = await Module.find({ cohort: req.params.cohortId, isActive: true })
    .sort({ order: 1 }).select("title description order resources minPassScore questions").lean();

  const completedIds = (req.user.completedModules || []).map(id => id.toString());

  const modulesWithProgress = modules.map((mod, index) => {
    const isCompleted = completedIds.includes(mod._id.toString());
    const isLocked    = index > 0 && !completedIds.includes(modules[index - 1]._id.toString());
    return {
      ...mod,
      isCompleted, isLocked,
      hasQuestions:  (mod.questions || []).length > 0,
      questionCount: (mod.questions || []).length,
      status: isCompleted ? "done" : isLocked ? "locked" : "available",
    };
  });

  res.json({ success: true, data: { modules: modulesWithProgress } });
}));

// GET questions for a module assessment (shuffle options for fairness)
router.get("/modules/:moduleId/questions", protect, asyncHandler(async (req, res) => {
  const module = await Module.findById(req.params.moduleId).populate({
    path: "questions", match: { isActive: true, type: "mcq" },
    select: "title description type difficulty options points subject topic",
  });

  if (!module) return res.status(404).json({ success: false, message: "Module not found" });

  // Check if student has already passed this module
  const alreadyPassed = req.user.completedModules?.some(
    id => id.toString() === req.params.moduleId
  );

  res.json({
    success: true,
    data: {
      module: {
        _id:          module._id,
        title:        module.title,
        minPassScore: module.minPassScore,
        questionCount: module.questions.length,
      },
      questions: module.questions,
      alreadyPassed,
    },
  });
}));

// POST submit module assessment — grades it + unlocks next module if passed
router.post("/modules/:moduleId/submit", protect, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  // answers = [{ questionId, selectedOption }]

  const module = await Module.findById(req.params.moduleId).populate({
    path: "questions", match: { type: "mcq" },
    select: "options points subject",
  });

  if (!module) return res.status(404).json({ success: false, message: "Module not found" });

  // Already completed — no need to retake
  const alreadyCompleted = req.user.completedModules?.some(
    id => id.toString() === req.params.moduleId
  );

  // Grade each answer
  let totalPoints   = 0;
  let earnedPoints  = 0;
  const gradedAnswers = [];

  for (const question of module.questions) {
    const answer       = answers.find(a => a.questionId === question._id.toString());
    const correctIndex = question.options.findIndex(o => o.isCorrect);
    const selected     = answer ? answer.selectedOption : -1;
    const isCorrect    = selected === correctIndex;
    const pts          = question.points || 10;

    totalPoints  += pts;
    if (isCorrect) earnedPoints += pts;

    gradedAnswers.push({
      questionId:    question._id,
      selectedOption: selected,
      correctOption:  correctIndex,
      isCorrect,
      points:         isCorrect ? pts : 0,
    });
  }

  const score   = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed  = score >= module.minPassScore;

  // If passed and not already completed → unlock next module
  if (passed && !alreadyCompleted) {
    // Add to user's completedModules
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { completedModules: module._id },
    });

    // Update analytics
    const analytics = await Analytics.findOne({ user: req.user._id });
    if (analytics) {
      analytics.modulesCompleted.push(module._id);
      analytics.moduleScores.push({ module: module._id, score, passedAt: new Date() });
      analytics.recalculateOverall();
      await analytics.save();
    }
  }

  res.json({
    success: true,
    data: {
      score,
      passed,
      minPassScore:  module.minPassScore,
      earnedPoints,
      totalPoints,
      gradedAnswers,
      message: passed
        ? score === 100 ? "Perfect score! 🎉" : `Passed with ${score}%! Next module unlocked 🔓`
        : `Score: ${score}%. Need ${module.minPassScore}% to pass. Try again!`,
    },
  });
}));

// STAFF: Create cohort
router.post("/", protect, staffOnly, asyncHandler(async (req, res) => {
  const cohort = await Cohort.create(req.body);
  res.status(201).json({ success: true, data: { cohort } });
}));

// STAFF: Create module
router.post("/:cohortId/modules", protect, staffOnly, asyncHandler(async (req, res) => {
  const module = await Module.create({ cohort: req.params.cohortId, ...req.body });
  await Cohort.findByIdAndUpdate(req.params.cohortId, { $push: { modules: module._id } });
  res.status(201).json({ success: true, data: { module } });
}));

module.exports = router;