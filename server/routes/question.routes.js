// routes/question.routes.js

const express      = require("express");
const router       = express.Router();
const asyncHandler = require("express-async-handler");
const Question     = require("../models/Question");
const { protect, staffOnly } = require("../middleware/auth");

// All routes require login
router.use(protect);

// GET questions with filters
// GET /api/questions?type=mcq&subject=OS&difficulty=easy&page=1&limit=10
router.get("/", asyncHandler(async (req, res) => {
  const { type, subject, difficulty, topic, tags, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };
  if (type)       filter.type       = type;
  if (subject)    filter.subject    = subject.toUpperCase();
  if (difficulty) filter.difficulty = difficulty;
  if (topic)      filter.topic      = topic;
  if (tags)       filter.tags       = { $in: tags.split(",") };

  const skip  = (page - 1) * limit;
  const total = await Question.countDocuments(filter);

  const questions = await Question.find(filter)
    .sort({ difficulty: 1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    // For MCQ: don't send which option is correct (that would be cheating!)
    .select("-options.isCorrect -explanation -testCases");

  res.json({
    success: true,
    data: {
      questions,
      pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) },
    },
  });
}));

// GET single question by ID (full details)
router.get("/:id", asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id).select("-options.isCorrect -testCases");

  if (!question) {
    return res.status(404).json({ success: false, message: "Question not found" });
  }

  // For coding: send visible examples but NOT test cases
  res.json({ success: true, data: { question } });
}));

// ── STAFF-ONLY: Add a question ────────────────────────────
router.post("/", staffOnly, asyncHandler(async (req, res) => {
  const question = await Question.create(req.body);
  res.status(201).json({ success: true, data: { question } });
}));

// ── STAFF-ONLY: Update a question ────────────────────────
router.put("/:id", staffOnly, asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!question) return res.status(404).json({ success: false, message: "Question not found" });
  res.json({ success: true, data: { question } });
}));

// ── STAFF-ONLY: Delete (soft delete) ─────────────────────
router.delete("/:id", staffOnly, asyncHandler(async (req, res) => {
  await Question.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: "Question removed" });
}));

module.exports = router;
