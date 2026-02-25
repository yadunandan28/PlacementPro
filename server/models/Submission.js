// ============================================================
//  models/Submission.js  —  Submission Schema
//  Stores every answer a student submits (MCQ or code)
// ============================================================

const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    // Who submitted
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which question was answered
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // "mcq" or "coding"
    type: {
      type: String,
      enum: ["mcq", "coding"],
      required: true,
    },

    // ── MCQ Submission Fields ─────────────────────────────

    // index of the option the student picked (0, 1, 2, or 3)
    selectedOption: {
      type: Number,
      default: null,
    },

    // was it correct?
    isCorrect: {
      type: Boolean,
      default: false,
    },

    // ── Coding Submission Fields ──────────────────────────

    // the actual code the student wrote
    code: {
      type: String,
      default: "",
    },

    // programming language used
    language: {
      type: String,
      enum: ["python", "javascript", "java", "cpp", "c"],
      default: "python",
    },

    // "pending" → waiting for Piston to run it
    // "running" → Piston is executing it now
    // "passed"  → all test cases passed
    // "failed"  → some test cases failed
    // "error"   → code had a runtime/compile error
    status: {
      type: String,
      enum: ["pending", "running", "passed", "failed", "error"],
      default: "pending",
    },

    // Results for each test case
    testResults: [
      {
        input:          { type: String },
        expectedOutput: { type: String },
        actualOutput:   { type: String },
        passed:         { type: Boolean },
        runtime:        { type: Number }, // in milliseconds
      },
    ],

    // How many test cases passed out of total
    testsPassed: { type: Number, default: 0 },
    testsTotal:  { type: Number, default: 0 },

    // execution time in milliseconds
    runtime: {
      type: Number,
      default: null,
    },

    // ── Common Fields ─────────────────────────────────────

    // score for this submission (0–100)
    score: {
      type: Number,
      default: 0,
    },

    // If this submission was for a module assessment
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      default: null,
    },
  },
  { timestamps: true } // createdAt = when submitted
);

// ── INDEXES ────────────────────────────────────────────────
submissionSchema.index({ user: 1, question: 1 });
submissionSchema.index({ user: 1, type: 1 });
submissionSchema.index({ user: 1, module: 1 });
submissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
