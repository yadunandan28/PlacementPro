const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const jdSessionSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileName:     { type: String, required: true },
  originalName: { type: String },
  cloudinaryUrl:{ type: String },            // PDF stored on Cloudinary
  cloudinaryId: { type: String },            // for deletion
  extractedText:{ type: String },            // raw PDF text
  chunks:       [{ type: String }],          // chunked text for retrieval
  focusAreas:   [{ type: String }],          // AI-extracted focus areas
  chatHistory:  [messageSchema],
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// Only one active session per user at a time
jdSessionSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model("JdSession", jdSessionSchema);