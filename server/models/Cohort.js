// ============================================================
//  models/Cohort.js  —  Cohort Schema
//  A cohort = a learning domain (AI/ML, Cloud, Web, etc.)
//  Each cohort has many Modules (defined separately below)
// ============================================================

const mongoose = require("mongoose");

const cohortSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cohort name is required"],
      unique: true,
      trim: true,
      // e.g. "AI / Machine Learning"
    },

    // URL-friendly name used in API routes
    // e.g. "ai-ml", "cloud-devops", "web-dev"
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: true,
    },

    // emoji icon shown in the UI
    icon: {
      type: String,
      default: "📚",
    },

    // color theme for this cohort card in the UI
    color: {
      type: String,
      default: "#3b82f6",
    },

    // list of technology tags shown on the card
    // e.g. ["Python", "TensorFlow", "MLOps"]
    tags: {
      type: [String],
      default: [],
    },

    // ordered list of modules in this cohort
    // each element is the _id of a Module document
    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ============================================================
//  models/Module.js  —  Module Schema
//  A module = one topic within a cohort
//  e.g. "Docker" inside "Cloud & DevOps"
// ============================================================

const moduleSchema = new mongoose.Schema(
  {
    cohort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Docker Fundamentals"
    },

    description: {
      type: String,
      default: "",
    },

    // position in the cohort (1 = first, 2 = second, etc.)
    order: {
      type: Number,
      required: true,
    },

    // Resources = learning materials for this module
    // Each resource has a type and URL
    resources: [
      {
        type: {
          type: String,
          enum: ["video", "notes", "article", "project"],
          required: true,
        },
        title:       { type: String, required: true },
        url:         { type: String, required: true },
        duration:    { type: String, default: "" },    // e.g. "1:03:02"
        description: { type: String, default: "" },
      },
    ],

    // minimum % score needed to pass this module's assessment
    // and unlock the next module
    minPassScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },

    // MCQ questions for this module's assessment
    // (references to Question documents)
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Cohort = mongoose.model("Cohort", cohortSchema);
const Module = mongoose.model("Module", moduleSchema);

module.exports = { Cohort, Module };
