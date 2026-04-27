const asyncHandler = require("express-async-handler");
const multer = require("multer");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const User = require("../models/User");
const { parsePdfBuffer } = require("../utils/jdPdf.util");
const {
  generateQuizQuestions,
  regenerateSingleQuestion,
} = require("../services/quizAi.service");

// ── Multer: syllabus (1) + materials (up to 8) ────────────
const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) =>
  file.mimetype === "application/pdf"
    ? cb(null, true)
    : cb(new Error("Only PDF files are allowed"), false);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadFields = upload.fields([
  { name: "syllabus", maxCount: 1 },
  { name: "materials", maxCount: 8 },
]);

// ── Helper: Fisher-Yates shuffle ──────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Helper: compute timing stats from answers ─────────────
function computeTimingStats(answers) {
  const buckets = { easy: [], medium: [], hard: [] };
  for (const a of answers) {
    const d = a.difficulty || "medium";
    buckets[d].push({ ms: a.timeSpentMs || 0, correct: a.isCorrect });
  }

  const stat = (arr) => {
    if (!arr.length)
      return { avgMs: 0, correctAvgMs: 0, count: 0, correctCount: 0 };
    const all = arr.map((x) => x.ms);
    const correct = arr.filter((x) => x.correct).map((x) => x.ms);
    return {
      count: arr.length,
      correctCount: correct.length,
      avgMs: Math.round(all.reduce((s, v) => s + v, 0) / all.length),
      correctAvgMs: correct.length
        ? Math.round(correct.reduce((s, v) => s + v, 0) / correct.length)
        : 0,
    };
  };

  return {
    easy: stat(buckets.easy),
    medium: stat(buckets.medium),
    hard: stat(buckets.hard),
  };
}

// ════════════════════════════════════════════════════════════
//  STAFF CONTROLLERS
// ════════════════════════════════════════════════════════════

// POST /api/quiz/staff/create
// Body: multipart — syllabus (PDF), materials[] (PDFs), title, description,
//       studentIds[] (JSON string or array), durationMinutes, numQuestions
const createQuiz = [
  uploadFields,
  asyncHandler(async (req, res) => {
    if (!req.files?.syllabus?.[0])
      return res
        .status(400)
        .json({ success: false, message: "Syllabus PDF is required" });

    if (!process.env.GROQ_API_KEY)
      return res
        .status(503)
        .json({ success: false, message: "AI service not configured" });

    const { title, description, durationMinutes, numQuestions } = req.body;
    if (!title?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Quiz title is required" });

    // Parse batches (e.g. ["22","23"]) and resolve to student IDs
    let batches = [];
    try {
      batches = JSON.parse(req.body.batches || "[]");
    } catch {
      batches = Array.isArray(req.body.batches) ? req.body.batches : [];
    }

    let studentIds = [];
    if (batches.length) {
      // Match students whose rollNumber starts with any of the selected batch years
      const batchPattern = batches
        .map((b) => String(b).replace(/\D/g, ""))
        .filter(Boolean)
        .join("|");
      const matched = await User.find({
        role: "student",
        isActive: true,
        rollNumber: { $regex: `^(${batchPattern})`, $options: "i" },
      })
        .select("_id")
        .lean();
      studentIds = matched.map((s) => s._id);
    }

    // Parse PDFs
    const syllabusText = await parsePdfBuffer(req.files.syllabus[0].buffer);
    if (!syllabusText || syllabusText.trim().length < 50)
      return res.status(400).json({
        success: false,
        message: "Syllabus PDF appears empty or image-only",
      });

    let materialsText = "";
    if (req.files?.materials?.length) {
      const parts = await Promise.all(
        req.files.materials.map((f) =>
          parsePdfBuffer(f.buffer).catch(() => ""),
        ),
      );
      materialsText = parts.filter(Boolean).join("\n\n");
    }

    const count = Math.min(Math.max(parseInt(numQuestions) || 24, 10), 40);

    console.log(`[Quiz] Syllabus text length: ${syllabusText.length} chars`);
    console.log(`[Quiz] Materials text length: ${materialsText.length} chars`);

    let questions;
    try {
      questions = await generateQuizQuestions(
        syllabusText,
        materialsText,
        count,
      );
    } catch (aiErr) {
      console.error("[Quiz] AI generation error:", aiErr.message);
      return res.status(502).json({
        success: false,
        message: `AI question generation failed: ${aiErr.message}`,
      });
    }

    // Always land in "review" so staff can verify questions before going live.
    // Store the intended schedule for use when staff approves.
    const pendingStartMode = req.body.startMode || "draft";
    const pendingScheduledAt = req.body.scheduledAt
      ? new Date(req.body.scheduledAt)
      : null;

    const quiz = await Quiz.create({
      createdBy: req.user._id,
      title: title.trim(),
      description: description?.trim() || "",
      syllabusText,
      questions,
      totalQuestions: questions.length,
      assignedStudents: studentIds,
      batches,
      durationMinutes: parseInt(durationMinutes) || 30,
      status: "review",
      pendingStartMode,
      pendingScheduledAt,
    });

    const batchMsg = batches.length
      ? `${batches.map((b) => `Batch ${b}`).join(", ")} — ${studentIds.length} student(s) enrolled.`
      : "No batch assigned.";

    res.status(201).json({
      success: true,
      message: `Quiz created with ${questions.length} questions — pending your review. ${batchMsg}`,
      data: { quiz },
    });
  }),
];

// GET /api/quiz/staff
const listStaffQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ createdBy: req.user._id })
    .select("-questions -syllabusText")
    .sort({ createdAt: -1 })
    .populate("assignedStudents", "name rollNumber department")
    .lean();

  // Attach attempt count per quiz
  const ids = quizzes.map((q) => q._id);
  const counts = await QuizAttempt.aggregate([
    { $match: { quiz: { $in: ids } } },
    {
      $group: {
        _id: "$quiz",
        attempted: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    countMap[String(c._id)] = c;
  });

  const enriched = quizzes.map((q) => ({
    ...q,
    attemptStats: countMap[String(q._id)] || { attempted: 0, completed: 0 },
  }));

  res.json({ success: true, data: { quizzes: enriched } });
});

// GET /api/quiz/staff/:id
const getStaffQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  })
    .populate("assignedStudents", "name rollNumber department email")
    .lean();
  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });

  // Get all attempts with timing stats
  const attempts = await QuizAttempt.find({ quiz: quiz._id })
    .populate("student", "name rollNumber department email")
    .select("-answers")
    .lean();

  res.json({ success: true, data: { quiz, attempts } });
});

// GET /api/quiz/staff/:id/results  — full per-student breakdown
const getQuizResults = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  }).lean();
  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });

  const attempts = await QuizAttempt.find({
    quiz: quiz._id,
    status: "completed",
  })
    .populate("student", "name rollNumber department email")
    .lean();

  // Per-question stats
  const qStats = {};
  quiz.questions.forEach((q) => {
    qStats[String(q._id)] = {
      text: q.text,
      difficulty: q.difficulty,
      topic: q.topic,
      correctCount: 0,
      totalAnswered: 0,
      avgTimeMs: 0,
      totalTimeMs: 0,
    };
  });

  for (const attempt of attempts) {
    for (const ans of attempt.answers) {
      const qs = qStats[String(ans.questionId)];
      if (!qs) continue;
      qs.totalAnswered++;
      qs.totalTimeMs += ans.timeSpentMs || 0;
      if (ans.isCorrect) qs.correctCount++;
    }
  }
  Object.values(qStats).forEach((qs) => {
    qs.avgTimeMs = qs.totalAnswered
      ? Math.round(qs.totalTimeMs / qs.totalAnswered)
      : 0;
    qs.accuracy = qs.totalAnswered
      ? Math.round((qs.correctCount / qs.totalAnswered) * 100)
      : 0;
    delete qs.totalTimeMs;
  });

  res.json({
    success: true,
    data: { quiz, attempts, questionStats: Object.values(qStats) },
  });
});

// PATCH /api/quiz/staff/:id/schedule
const scheduleQuiz = asyncHandler(async (req, res) => {
  const { scheduledAt, durationMinutes } = req.body;
  if (!scheduledAt)
    return res
      .status(400)
      .json({ success: false, message: "scheduledAt is required" });

  const quiz = await Quiz.findOneAndUpdate(
    {
      _id: req.params.id,
      createdBy: req.user._id,
      status: { $in: ["draft", "scheduled"] },
    },
    {
      status: "scheduled",
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 30,
    },
    { new: true },
  );
  if (!quiz)
    return res
      .status(404)
      .json({ success: false, message: "Quiz not found or already started" });

  res.json({ success: true, message: "Quiz scheduled", data: { quiz } });
});

// PATCH /api/quiz/staff/:id/reschedule  (edit time — only if >5 min until current schedule)
const rescheduleQuiz = asyncHandler(async (req, res) => {
  const { scheduledAt, durationMinutes } = req.body;
  if (!scheduledAt)
    return res
      .status(400)
      .json({ success: false, message: "scheduledAt is required" });

  const quiz = await Quiz.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    status: "scheduled",
  });
  if (!quiz)
    return res.status(404).json({
      success: false,
      message: "Quiz not found or not in scheduled state",
    });

  const LOCK_MS = 5 * 60 * 1000;
  const msToCurrent = new Date(quiz.scheduledAt) - Date.now();
  if (msToCurrent < LOCK_MS) {
    const minsLeft = Math.max(0, Math.ceil(msToCurrent / 60000));
    return res.status(400).json({
      success: false,
      message:
        msToCurrent <= 0
          ? "Quiz is already past its scheduled start time"
          : `Cannot edit — quiz starts in ${minsLeft} minute(s). Edits are locked within 5 minutes of start.`,
    });
  }

  const newTime = new Date(scheduledAt);
  if (isNaN(newTime.getTime()))
    return res
      .status(400)
      .json({ success: false, message: "Invalid date/time" });

  quiz.scheduledAt = newTime;
  if (durationMinutes) quiz.durationMinutes = parseInt(durationMinutes);
  await quiz.save();

  res.json({ success: true, message: "Quiz rescheduled", data: { quiz } });
});

// PATCH /api/quiz/staff/:id/start  — manually start
const startQuizManually = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOneAndUpdate(
    {
      _id: req.params.id,
      createdBy: req.user._id,
      status: { $in: ["draft", "scheduled"] },
    },
    { status: "active", startedAt: new Date() },
    { new: true },
  );
  if (!quiz)
    return res.status(404).json({
      success: false,
      message: "Quiz not found or already active/completed",
    });

  res.json({ success: true, message: "Quiz is now live", data: { quiz } });
});

// PATCH /api/quiz/staff/:id/end
const endQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id, status: "active" },
    { status: "completed", endedAt: new Date() },
    { new: true },
  );
  if (!quiz)
    return res
      .status(404)
      .json({ success: false, message: "Quiz not found or not active" });

  // Auto-submit any in-progress attempts
  await QuizAttempt.updateMany(
    { quiz: quiz._id, status: "in_progress" },
    { status: "completed", submittedAt: new Date() },
  );

  res.json({ success: true, message: "Quiz ended", data: { quiz } });
});

// PATCH /api/quiz/staff/:id/assign  — update assigned students
const updateAssignedStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds))
    return res
      .status(400)
      .json({ success: false, message: "studentIds array required" });

  const quiz = await Quiz.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { assignedStudents: studentIds },
    { new: true },
  ).populate("assignedStudents", "name rollNumber department");

  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });
  res.json({ success: true, message: "Students updated", data: { quiz } });
});

// DELETE /api/quiz/staff/:id
const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.user._id,
    status: { $ne: "active" },
  });
  if (!quiz)
    return res
      .status(404)
      .json({ success: false, message: "Quiz not found or currently active" });
  await QuizAttempt.deleteMany({ quiz: quiz._id });
  res.json({ success: true, message: "Quiz deleted" });
});

// ════════════════════════════════════════════════════════════
//  STUDENT CONTROLLERS
// ════════════════════════════════════════════════════════════

// GET /api/quiz/my
const getMyQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ assignedStudents: req.user._id })
    .select("-questions -syllabusText")
    .sort({ createdAt: -1 })
    .populate("createdBy", "name")
    .lean();

  // Attach each student's attempt status
  const ids = quizzes.map((q) => q._id);
  const attempts = await QuizAttempt.find({
    quiz: { $in: ids },
    student: req.user._id,
  })
    .select("quiz status score percentage submittedAt")
    .lean();
  const attemptMap = {};
  attempts.forEach((a) => {
    attemptMap[String(a.quiz)] = a;
  });

  const enriched = quizzes.map((q) => ({
    ...q,
    myAttempt: attemptMap[String(q._id)] || null,
  }));

  res.json({ success: true, data: { quizzes: enriched } });
});

// POST /api/quiz/:id/start
const startAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });
  if (quiz.status !== "active")
    return res.status(400).json({
      success: false,
      message: `Quiz is ${quiz.status}. Wait for staff to start it.`,
    });
  if (!quiz.assignedStudents.map(String).includes(String(req.user._id)))
    return res
      .status(403)
      .json({ success: false, message: "You are not assigned to this quiz" });

  // Check for existing attempt
  let attempt = await QuizAttempt.findOne({
    quiz: quiz._id,
    student: req.user._id,
  });
  if (attempt?.status === "completed")
    return res.status(400).json({
      success: false,
      message: "You have already submitted this quiz",
    });

  if (!attempt) {
    // Create new attempt with shuffled question order
    const questionOrder = shuffle(quiz.questions.map((q) => String(q._id)));
    attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user._id,
      questionOrder,
      totalQuestions: quiz.questions.length,
      status: "in_progress",
      startedAt: new Date(),
    });
  }

  // Build question list in shuffled order (no isCorrect sent to student)
  const qMap = {};
  quiz.questions.forEach((q) => {
    qMap[String(q._id)] = q;
  });

  const shuffledQuestions = attempt.questionOrder
    .map((qid) => {
      const q = qMap[qid];
      if (!q) return null;
      return {
        _id: String(q._id),
        text: q.text,
        difficulty: q.difficulty,
        topic: q.topic,
        options: q.options.map((o) => o.text), // only text, no isCorrect
      };
    })
    .filter(Boolean);

  res.json({
    success: true,
    data: {
      attemptId: String(attempt._id),
      questions: shuffledQuestions,
      durationMinutes: quiz.durationMinutes,
      startedAt: attempt.startedAt,
    },
  });
});

// POST /api/quiz/:id/submit
// Body: { answers: [{ questionId, selectedText, timeSpentMs }] }
const submitQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });

  const attempt = await QuizAttempt.findOne({
    quiz: quiz._id,
    student: req.user._id,
  });
  if (!attempt)
    return res
      .status(404)
      .json({ success: false, message: "No active attempt found" });
  if (attempt.status === "completed")
    return res
      .status(400)
      .json({ success: false, message: "Already submitted" });

  const { answers } = req.body;
  if (!Array.isArray(answers))
    return res
      .status(400)
      .json({ success: false, message: "answers array required" });

  // Build a map: questionId → question for grading
  const qMap = {};
  quiz.questions.forEach((q) => {
    qMap[String(q._id)] = q;
  });

  const gradedAnswers = answers
    .map((a) => {
      const q = qMap[String(a.questionId)];
      if (!q) return null;
      const correctOption = q.options.find((o) => o.isCorrect);
      const isCorrect =
        correctOption?.text?.trim().toLowerCase() ===
        String(a.selectedText || "")
          .trim()
          .toLowerCase();
      return {
        questionId: q._id,
        selectedText: a.selectedText || "",
        isCorrect,
        timeSpentMs: Math.max(0, parseInt(a.timeSpentMs) || 0),
        difficulty: q.difficulty,
        answeredAt: new Date(),
      };
    })
    .filter(Boolean);

  const score = gradedAnswers.filter((a) => a.isCorrect).length;
  const percentage =
    gradedAnswers.length > 0
      ? Math.round((score / gradedAnswers.length) * 100)
      : 0;
  const timingStats = computeTimingStats(gradedAnswers);

  attempt.answers = gradedAnswers;
  attempt.score = score;
  attempt.percentage = percentage;
  attempt.timingStats = timingStats;
  attempt.status = "completed";
  attempt.submittedAt = new Date();
  await attempt.save();

  res.json({
    success: true,
    message: "Quiz submitted",
    data: {
      score,
      percentage,
      totalQuestions: gradedAnswers.length,
      timingStats,
    },
  });
});

// GET /api/quiz/:id/my-result
const getMyResult = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz)
    return res.status(404).json({ success: false, message: "Quiz not found" });

  const attempt = await QuizAttempt.findOne({
    quiz: quiz._id,
    student: req.user._id,
    status: "completed",
  }).lean();
  if (!attempt)
    return res
      .status(404)
      .json({ success: false, message: "No completed attempt found" });

  // Attach question details to answers
  const qMap = {};
  quiz.questions.forEach((q) => {
    qMap[String(q._id)] = q;
  });

  const detailedAnswers = attempt.answers.map((a) => {
    const q = qMap[String(a.questionId)];
    return {
      questionText: q?.text || "",
      difficulty: a.difficulty,
      topic: q?.topic || "",
      selectedText: a.selectedText,
      correctText: q?.options?.find((o) => o.isCorrect)?.text || "",
      isCorrect: a.isCorrect,
      timeSpentMs: a.timeSpentMs,
      explanation: q?.explanation || "",
    };
  });

  res.json({
    success: true,
    data: {
      quizTitle: quiz.title,
      score: attempt.score,
      percentage: attempt.percentage,
      totalQuestions: attempt.totalQuestions,
      timingStats: attempt.timingStats,
      answers: detailedAnswers,
      submittedAt: attempt.submittedAt,
    },
  });
});

// ════════════════════════════════════════════════════════════
//  REVIEW WORKFLOW
// ════════════════════════════════════════════════════════════

// PATCH /api/quiz/staff/:id/questions/:qIdx/regenerate
// Body: { comment } — staff feedback for one question
const regenerateQuestion = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const idx = parseInt(req.params.qIdx, 10);

  if (!comment?.trim())
    return res
      .status(400)
      .json({ success: false, message: "Feedback comment is required" });

  const quiz = await Quiz.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    status: "review",
  });
  if (!quiz)
    return res
      .status(404)
      .json({
        success: false,
        message: "Quiz not found or not in review status",
      });

  if (isNaN(idx) || idx < 0 || idx >= quiz.questions.length)
    return res
      .status(400)
      .json({ success: false, message: "Invalid question index" });

  const existing = quiz.questions[idx];
  let revised;
  try {
    revised = await regenerateSingleQuestion(
      existing.toObject(),
      comment.trim(),
      quiz.syllabusText,
    );
  } catch (aiErr) {
    return res
      .status(502)
      .json({
        success: false,
        message: `AI regeneration failed: ${aiErr.message}`,
      });
  }

  // Merge back — preserve the Mongoose _id of the question
  Object.assign(quiz.questions[idx], revised);
  quiz.markModified("questions");
  await quiz.save();

  res.json({
    success: true,
    message: "Question regenerated",
    data: { question: quiz.questions[idx] },
  });
});

// PATCH /api/quiz/staff/:id/approve
// Body: { startMode: "now"|"scheduled"|"draft", scheduledAt? }
// Moves the quiz from "review" → active / scheduled / draft
const approveQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    status: "review",
  });
  if (!quiz)
    return res
      .status(404)
      .json({
        success: false,
        message: "Quiz not found or not in review status",
      });

  const mode = req.body.startMode || quiz.pendingStartMode || "draft";
  const schedAt = req.body.scheduledAt
    ? new Date(req.body.scheduledAt)
    : quiz.pendingScheduledAt;

  if (mode === "now") {
    quiz.status = "active";
    quiz.startedAt = new Date();
  } else if (mode === "scheduled" && schedAt) {
    quiz.status = "scheduled";
    quiz.scheduledAt = schedAt;
  } else {
    quiz.status = "draft";
  }

  await quiz.save();

  const modeMsg =
    mode === "now"
      ? "Quiz is now live!"
      : mode === "scheduled"
        ? `Scheduled for ${quiz.scheduledAt.toLocaleString()}`
        : "Saved as draft.";

  res.json({
    success: true,
    message: `Quiz approved. ${modeMsg}`,
    data: { quiz },
  });
});

module.exports = {
  createQuiz,
  listStaffQuizzes,
  getStaffQuiz,
  getQuizResults,
  scheduleQuiz,
  rescheduleQuiz,
  startQuizManually,
  endQuiz,
  updateAssignedStudents,
  deleteQuiz,
  regenerateQuestion,
  approveQuiz,
  getMyQuizzes,
  startAttempt,
  submitQuiz,
  getMyResult,
};
