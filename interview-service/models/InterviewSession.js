// interview-service/models/InterviewSession.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  order:        { type: Number, required: true },
  type:         { type: String, enum: ["verbal", "coding"], required: true },
  question:     { type: String, required: true },
  transcript:   { type: String, default: "" },
  code:         { type: String, default: "" },
  language:     { type: String, default: "python" },
  codeOutput:   { type: String, default: "" },
  codeStatus:   { type: String, default: "" },
  score:        { type: Number, default: 0, min: 0, max: 10 },
  feedback:     { type: String, default: "" },
  timeSpent:    { type: Number, default: 0 },
  answered:     { type: Boolean, default: false },
}, { _id: false });

const RecordingSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionType:  { type: String, default: "verbal" },
  cloudinaryUrl: { type: String, default: "" },
  publicId:      { type: String, default: "" },
  duration:      { type: Number, default: 0 },
  uploadedAt:    { type: Date,   default: Date.now },
  deleteAt:      { type: Date,   required: true },
  expired:       { type: Boolean, default: false },
}, { _id: false });

const InterviewSessionSchema = new mongoose.Schema({
  slot:    { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSlot", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User",          required: true },
  jdText:        { type: String, default: "" },
  jdFileName:    { type: String, default: "" },
  resumeSummary: { type: String, default: "" },
  questions:            [QuestionSchema],
  currentQuestionIndex: { type: Number, default: 0 },
  recordings:           [RecordingSchema],
  status: {
    type: String,
    enum: ["in_progress", "completed"],
    default: "in_progress",
  },
  totalScore:      { type: Number, default: 0 },
  maxScore:        { type: Number, default: 70 },
  percentageScore: { type: Number, default: 0 },
  aiReport:        { type: String, default: "" },
  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("InterviewSession", InterviewSessionSchema);