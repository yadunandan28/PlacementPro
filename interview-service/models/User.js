// interview-service/models/User.js
// Minimal User schema — matches the main server's User collection.
// We only need this so Mongoose can .populate() the `student` and
// `scheduledBy` refs on InterviewSlot. We never write to this model
// from the interview service.

const mongoose = require("mongoose");

// Guard: don't re-register if already registered (hot-reload safety)
if (mongoose.models.User) {
  module.exports = mongoose.models.User;
} else {
  const UserSchema = new mongoose.Schema({
    name:        { type: String },
    email:       { type: String },
    role:        { type: String },
    rollNumber:  { type: String },
    department:  { type: String },
    cohort:      { type: mongoose.Schema.Types.ObjectId, ref: "Cohort" },
    profilePic:  { type: String },
  }, {
    timestamps: true,
    // Use the SAME collection as the main server
    collection: "users",
  });

  module.exports = mongoose.model("User", UserSchema);
}