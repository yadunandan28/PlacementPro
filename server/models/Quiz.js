const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: { type: [optionSchema], validate: (v) => v.length === 4 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    topic: { type: String, default: "" },
    explanation: { type: String, default: "" },
    staffComment: { type: String, default: "" }, // reviewer feedback for regeneration
  },
  { _id: true },
);

const quizSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    syllabusText: { type: String, default: "" },
    questions: [questionSchema],
    totalQuestions: { type: Number, default: 0 },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    batches: [{ type: String }], // e.g. ["22","23"] — batch years from roll number prefix
    status: {
      type: String,
      enum: ["review", "draft", "scheduled", "active", "completed"],
      default: "review",
    },
    // Intended schedule stored at create time; applied when staff approves
    pendingStartMode: {
      type: String,
      enum: ["now", "scheduled", "draft"],
      default: "draft",
    },
    pendingScheduledAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 30 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

quizSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Quiz", quizSchema);
