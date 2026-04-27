const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedText: { type: String, default: "" }, // text of chosen option
    isCorrect: { type: Boolean, default: false },
    timeSpentMs: { type: Number, default: 0 }, // ms spent on this question
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    answeredAt: { type: Date, default: null },
  },
  { _id: false },
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Shuffled question order for this student (array of questionId strings)
    questionOrder: [{ type: String }],

    answers: [answerSchema],
    score: { type: Number, default: 0 }, // number correct
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },

    // Per-difficulty timing stats (populated on submit)
    timingStats: {
      easy: {
        avgMs: Number,
        correctAvgMs: Number,
        count: Number,
        correctCount: Number,
      },
      medium: {
        avgMs: Number,
        correctAvgMs: Number,
        count: Number,
        correctCount: Number,
      },
      hard: {
        avgMs: Number,
        correctAvgMs: Number,
        count: Number,
        correctCount: Number,
      },
    },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
