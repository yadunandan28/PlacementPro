const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, "Name is required"], trim: true,
      minlength: [2, "Min 2 chars"], maxlength: [50, "Max 50 chars"],
    },
    email: {
      type: String, required: [true, "Email is required"],
      unique: true,  // unique:true already creates an index — don't add schema.index({email:1})
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String, required: [true, "Password is required"],
      minlength: [6, "Min 6 chars"], select: false,
    },
    role:       { type: String, enum: ["student","staff","admin"], default: "student" },
    department: {
      type: String,
      enum: [
        "Computer Science & Engineering","Information Technology",
        "Electronics & Communication","Electrical Engineering",
        "Mechanical Engineering","Civil Engineering",
      ],
      default: "Computer Science & Engineering",
    },
    rollNumber:       { type: String, trim: true, default: "" },
    cgpa:             { type: Number, min: 0, max: 10, default: 0 },
    cohort:           { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", default: null },
    skills:           { type: [String], default: [] },
    resumeUrl:        { type: String, default: "" },
    resumePublicId:   { type: String, default: "" },
    completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }],
    isActive:         { type: Boolean, default: true },
    lastLogin:        { type: Date, default: null },
    refreshToken:     { type: String, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id, name: this.name, email: this.email, role: this.role,
    department: this.department, rollNumber: this.rollNumber, cgpa: this.cgpa,
    cohort: this.cohort, skills: this.skills, resumeUrl: this.resumeUrl,
    completedModules: this.completedModules, lastLogin: this.lastLogin, createdAt: this.createdAt,
  };
};

// Only indexes NOT already created by unique:true
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ cohort: 1 });

module.exports = mongoose.model("User", userSchema);
