const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  detail:         { type: String, default: "" },
  estimatedHours: { type: Number, default: 2 },
  done:           { type: Boolean, default: false },
}, { _id: true });

const phaseSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  summary: { type: String, default: "" },
  goals:   [{ type: String }],
  tasks:   [taskSchema],
  resources: [{
    title: { type: String },
    type:  { type: String, default: "link" },
    url:   { type: String, default: "" },
  }],
}, { _id: true });

const interviewPrepSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  originalName:   { type: String, required: true },
  cloudinaryUrl:  { type: String },
  cloudinaryId:   { type: String },
  extractedText: { type: String },
  focusAreas:     [{ type: String }],
  roleSummary:    { type: String, default: "" },
  planStatus:     {
    type: String,
    enum: ["uploaded", "generating", "ready", "failed"],
    default: "uploaded",
  },
  planError:      { type: String },
  preparationPlan: {
    timelineWeeks: { type: Number },
    phases:        [phaseSchema],
    interviewTips: [{ type: String }],
    topicsToDrill: [{ type: String }],
  },
  planGeneratedAt: { type: Date },
}, { timestamps: true });

interviewPrepSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewPrep", interviewPrepSchema);
