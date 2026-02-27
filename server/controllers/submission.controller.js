// ============================================================
//  controllers/submission.controller.js
//  Handles MCQ answers and code submissions
// ============================================================

const Submission = require("../models/Submission");
const Question   = require("../models/Question");
const Analytics  = require("../models/Analytics");
const User       = require("../models/User");
const { judgeSubmission } = require("../utils/pistonRunner");

// ── SUBMIT MCQ ANSWER ─────────────────────────────────────
// POST /api/submissions/mcq
// Body: { questionId, selectedOption, moduleId? }

const submitMCQ = async (req, res) => {
  const { questionId, selectedOption, moduleId } = req.body;

  // Get the question from DB
  const question = await Question.findById(questionId);
  if (!question || question.type !== "mcq") {
    return res.status(404).json({ success: false, message: "Question not found" });
  }

  // Check if the selected option is correct
  const correctIndex = question.options.findIndex((opt) => opt.isCorrect === true);
  const isCorrect    = selectedOption === correctIndex;
  const score        = isCorrect ? question.points || 10 : 0;

  // Save submission to DB
  const submission = await Submission.create({
    user:           req.user._id,
    question:       questionId,
    type:           "mcq",
    selectedOption,
    isCorrect,
    score,
    module:         moduleId || null,
  });

  // Update analytics (update subject scores)
  await updateSubjectScore(req.user._id, question.subject, isCorrect);

  res.json({
    success: true,
    message: isCorrect ? "Correct! ✅" : "Incorrect ❌",
    data: {
      isCorrect,
      score,
      correctOption:  correctIndex,
      explanation:    question.explanation,
      submissionId:   submission._id,
    },
  });
};

// ── SUBMIT CODE ───────────────────────────────────────────
// POST /api/submissions/code
// Body: { questionId, code, language, moduleId? }

const submitCode = async (req, res) => {
  const { questionId, code, language, moduleId } = req.body;

  // Get the question and its test cases
  const question = await Question.findById(questionId);
  if (!question || question.type !== "coding") {
    return res.status(404).json({ success: false, message: "Question not found" });
  }

  if (!question.testCases || question.testCases.length === 0) {
    return res.status(400).json({ success: false, message: "No test cases found for this problem" });
  }

  // Create a "pending" submission first (so UI can show loading)
  const submission = await Submission.create({
    user:     req.user._id,
    question: questionId,
    type:     "coding",
    code,
    language,
    status:   "running",
    module:   moduleId || null,
  });

  try {
    // Run the code against all test cases using Piston
    const judgeResult = await judgeSubmission(language, code, question.testCases);

    // Update the submission with results
    submission.status      = judgeResult.status;
    submission.testResults = judgeResult.results;
    submission.testsPassed = judgeResult.testsPassed;
    submission.testsTotal  = judgeResult.testsTotal;
    submission.score       = judgeResult.score;
    submission.runtime     = judgeResult.runtime;
    await submission.save();

    // If passed, update analytics
    if (judgeResult.status === "passed") {
      await updateCodingStats(req.user._id, question.difficulty);
    }

    // Only show visible test cases to the student (not hidden ones)
    const visibleResults = judgeResult.results.filter((_, i) =>
      !question.testCases[i]?.isHidden
    );

    res.json({
      success: true,
      message: judgeResult.status === "passed"
        ? `All ${judgeResult.testsTotal} test cases passed! 🎉`
        : `${judgeResult.testsPassed}/${judgeResult.testsTotal} test cases passed`,
      data: {
        status:       judgeResult.status,
        testsPassed:  judgeResult.testsPassed,
        testsTotal:   judgeResult.testsTotal,
        score:        judgeResult.score,
        runtime:      judgeResult.runtime,
        results:      visibleResults,   // only visible results to student
        submissionId: submission._id,
      },
    });

  } catch (error) {
    // Piston error — update submission status
    submission.status = "error";
    await submission.save();

    res.status(500).json({
      success: false,
      message: "Code execution failed. Check your code and try again.",
      error:   error.message,
    });
  }
};

// ── GET MY SUBMISSIONS ────────────────────────────────────
// GET /api/submissions/my?type=&subject=

const getMySubmissions = async (req, res) => {
  const { type, subject, limit = 20, page = 1 } = req.query;

  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const skip  = (page - 1) * limit;
  const total = await Submission.countDocuments(filter);

  const submissions = await Submission.find(filter)
    .populate("question", "title subject difficulty type")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({
    success: true,
    data: {
      submissions,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) },
    },
  });
};

// ── HELPER: Update subject score in Analytics ─────────────
// Called every time an MCQ is submitted
const updateSubjectScore = async (userId, subject, isCorrect) => {
  try {
    let analytics = await Analytics.findOne({ user: userId });
    if (!analytics) {
      analytics = await Analytics.create({ user: userId });
    }

    // Map question subject → analytics field
    const subjectMap = {
      OS:   { score: "osScore",   attempts: "osAttempts" },
      DBMS: { score: "dbmsScore", attempts: "dbmsAttempts" },
      CN:   { score: "cnScore",   attempts: "cnAttempts" },
      DSA:  { score: "dsaScore",  attempts: "dsaAttempts" },
    };

    const fields = subjectMap[subject.toUpperCase()];
    if (!fields) return;

    // Running average: newAvg = (oldAvg * oldCount + newScore) / (oldCount + 1)
    const oldScore    = analytics[fields.score]    || 0;
    const oldAttempts = analytics[fields.attempts] || 0;
    const newScore    = isCorrect ? 100 : 0;

    analytics[fields.score]    = Math.round((oldScore * oldAttempts + newScore) / (oldAttempts + 1));
    analytics[fields.attempts] = oldAttempts + 1;

    analytics.recalculateOverall();
    await analytics.save();
  } catch (err) {
    console.error("Analytics update error:", err.message);
  }
};

// ── HELPER: Update coding stats + DSA score ──────────────
const updateCodingStats = async (userId, difficulty) => {
  try {
    const Question = require("../models/Question");
    let analytics = await Analytics.findOne({ user: userId });
    if (!analytics) analytics = await Analytics.create({ user: userId });

    analytics.totalCodeSubmissions += 1;
    analytics.codePassed           += 1;

    if (difficulty === "easy")   analytics.easyPassed   += 1;
    if (difficulty === "medium") analytics.mediumPassed += 1;
    if (difficulty === "hard")   analytics.hardPassed   += 1;

    // DSA score = % of total coding problems solved
    const totalProblems = await Question.countDocuments({ type: "coding", isActive: true });
    if (totalProblems > 0) {
      analytics.dsaScore = Math.min(100, Math.round((analytics.codePassed / totalProblems) * 100));
    }

    analytics.recalculateOverall();
    await analytics.save();
  } catch (err) {
    console.error("Coding stats update error:", err.message);
  }
};

module.exports = { submitMCQ, submitCode, getMySubmissions };