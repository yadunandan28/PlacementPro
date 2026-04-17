const mongoose = require("mongoose");

const enrollmentTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    estimatedHours: { type: Number, default: 2 },
    done: { type: Boolean, default: false },
  },
  { _id: true },
);

const enrollmentPhaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    goals: [{ type: String }],
    tasks: [enrollmentTaskSchema],
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

const trainingEnrollmentSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrainingCampaign",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    roleSummary: { type: String, default: "" },
    focusAreas: [{ type: String }],
    timelineWeeks: { type: Number, default: 4 },
    phases: [enrollmentPhaseSchema],
    interviewTips: [{ type: String }],
    topicsToDrill: [{ type: String }],
    status: {
      type: String,
      enum: ["enrolled", "in_progress", "completed"],
      default: "enrolled",
    },
    notificationTitle: { type: String, default: "New training assigned" },
    notificationText: { type: String, default: "" },
    notificationRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

trainingEnrollmentSchema.index({ student: 1, createdAt: -1 });
trainingEnrollmentSchema.index({ campaign: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("TrainingEnrollment", trainingEnrollmentSchema);
