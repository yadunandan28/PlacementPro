const mongoose = require("mongoose");

const InterviewSlotSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    default: 45, // minutes
  },
  // JD to use — if null, interview service will use student's latest JD session
  jdText: {
    type: String,
    default: "",
  },
  jdFileName: {
    type: String,
    default: "",
  },
  // Resume to use — populated when student joins
  resumeText: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed", "cancelled"],
    default: "scheduled",
  },
  interviewSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InterviewSession",
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("InterviewSlot", InterviewSlotSchema);