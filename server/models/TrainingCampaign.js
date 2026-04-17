const mongoose = require("mongoose");

const campaignPhaseTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    estimatedHours: { type: Number, default: 2 },
  },
  { _id: true },
);

const campaignPhaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    goals: [{ type: String }],
    tasks: [campaignPhaseTaskSchema],
    resources: [
      {
        title: { type: String, default: "" },
        type: { type: String, default: "link" },
        url: { type: String, default: "" },
      },
    ],
  },
  { _id: true },
);

const matchedStudentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchScore: { type: Number, default: 0 },
    reasons: [{ type: String }],
    assigned: { type: Boolean, default: false },
  },
  { _id: false },
);

const trainingCampaignSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalName: { type: String, required: true },
    extractedText: { type: String, default: "" },
    focusAreas: [{ type: String }],
    roleSummary: { type: String, default: "" },
    timelineWeeks: { type: Number, default: 4 },
    phases: [campaignPhaseSchema],
    interviewTips: [{ type: String }],
    topicsToDrill: [{ type: String }],
    matchedStudents: [matchedStudentSchema],
    assignedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

trainingCampaignSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("TrainingCampaign", trainingCampaignSchema);
