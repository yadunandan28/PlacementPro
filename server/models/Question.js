// ============================================================
//  models/Question.js  —  Question Schema
//  Handles both MCQ questions and coding problems
//
//  type: "mcq"    → multiple choice question
//  type: "coding" → programming problem
// ============================================================

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // ── What kind of question? ────────────────────────────
    type: {
      type: String,
      enum: ["mcq", "coding"],
      required: true,
    },

    // ── Which subject / area? ─────────────────────────────
    // For MCQ: "OS", "DBMS", "CN", "DSA"
    // For coding: the cohort slug e.g. "ai-ml" or "general"
    subject: {
      type: String,
      required: true,
      // e.g. "OS", "DBMS", "CN", "DSA", "web-dev", "ai-ml"
    },

    // Topic within the subject
    // e.g. subject="OS", topic="process-management"
    topic: {
      type: String,
      required: true,
      lowercase: true,
    },

    // ── Difficulty ────────────────────────────────────────
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    // ── The Question Text ─────────────────────────────────
    title: {
      type: String,
      required: true,
      // For coding: "Two Sum"
      // For MCQ: the full question text
    },

    // Longer description (mostly used for coding problems)
    description: {
      type: String,
      default: "",
    },

    // Tags for filtering: e.g. ["arrays", "hash-map", "two-pointer"]
    tags: {
      type: [String],
      default: [],
    },

    // ── MCQ-only Fields ───────────────────────────────────

    // The 4 options shown to the student
    options: [
      {
        text:      { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],

    // Explanation shown after the student answers
    explanation: {
      type: String,
      default: "",
    },

    // ── Coding-only Fields ────────────────────────────────

    // Example inputs/outputs shown in the problem description
    examples: [
      {
        input:       { type: String },
        output:      { type: String },
        explanation: { type: String, default: "" },
      },
    ],

    // Hidden test cases used to judge submissions
    testCases: [
      {
        input:          { type: String },
        expectedOutput: { type: String },
        isHidden:       { type: Boolean, default: false }, // hidden = not shown to student
      },
    ],

    // Default code shown in the editor for each language
    // e.g. { python: "def twoSum(...):\n    pass", java: "class Solution {...}" }
    starterCode: {
      type: Map,       // Map lets us store any key-value pairs
      of: String,
      default: {},
    },

    // Which module this question belongs to (optional)
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      default: null,
    },

    // How many points this question is worth
    points: {
      type: Number,
      default: 10,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── INDEXES for fast filtering ─────────────────────────────
questionSchema.index({ type: 1, subject: 1 });
questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ module: 1 });

module.exports = mongoose.model("Question", questionSchema);
