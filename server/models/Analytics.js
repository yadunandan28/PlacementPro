"use strict";
const mongoose = require("mongoose");

// Guard against double-registration (common cause of "not a function" errors)
if (mongoose.models && mongoose.models.Analytics) {
  module.exports = mongoose.model("Analytics");
  return;
}

const analyticsSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cohort: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", default: null },

    dsaScore:     { type: Number, default: 0 },
    osScore:      { type: Number, default: 0 },
    dbmsScore:    { type: Number, default: 0 },
    cnScore:      { type: Number, default: 0 },

    dsaAttempts:  { type: Number, default: 0 },
    osAttempts:   { type: Number, default: 0 },
    dbmsAttempts: { type: Number, default: 0 },
    cnAttempts:   { type: Number, default: 0 },

    totalCodeSubmissions: { type: Number, default: 0 },
    codePassed:           { type: Number, default: 0 },
    easyPassed:           { type: Number, default: 0 },
    mediumPassed:         { type: Number, default: 0 },
    hardPassed:           { type: Number, default: 0 },

    modulesCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }],
    moduleScores: [{
      module:   { type: mongoose.Schema.Types.ObjectId, ref: "Module" },
      score:    { type: Number, default: 0 },
      passedAt: { type: Date },
    }],

    overallScore: { type: Number, default: 0 },

    mockInterviewScore:   { type: Number, default: null },
    mockInterviewRemarks: { type: String,  default: "" },

    scoreHistory: [{
      date: { type: Date, default: Date.now },
      overallScore: Number, dsaScore: Number,
      dbmsScore: Number, osScore: Number, cnScore: Number,
    }],
  },
  { timestamps: true }
);

analyticsSchema.methods.recalculateOverall = function () {
  const scores = [this.dsaScore, this.osScore, this.dbmsScore, this.cnScore].filter(s => s > 0);
  this.overallScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
};

analyticsSchema.index({ cohort: 1 });
analyticsSchema.index({ overallScore: -1 });

module.exports = mongoose.model("Analytics", analyticsSchema);