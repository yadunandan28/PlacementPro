const User      = require("../models/User");
const { Cohort } = require("../models/Cohort");

// Helper: safely get Analytics without crashing if model is broken
const getAnalytics = () => {
  try { return require("../models/Analytics"); }
  catch { return null; }
};

// GET /api/users/profile
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("cohort", "name slug icon color tags");
  res.json({ success: true, data: { user: user.toPublicJSON() } });
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  const { name, department, rollNumber, cgpa, skills, bio } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, department, rollNumber, cgpa, skills, bio },
    { new: true, runValidators: true }
  ).populate("cohort", "name slug icon");
  res.json({ success: true, message: "Profile updated!", data: { user: user.toPublicJSON() } });
};

// POST /api/users/select-cohort
const selectCohort = async (req, res) => {
  const { cohortId } = req.body;

  const cohort = await Cohort.findById(cohortId);
  if (!cohort) {
    return res.status(404).json({ success: false, message: "Cohort not found" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { cohort: cohortId },
    { new: true }
  ).populate("cohort", "name slug icon color");

  // Update analytics cohort — non-critical, don't let it crash the response
  try {
    const Analytics = getAnalytics();
    if (Analytics && typeof Analytics.findOneAndUpdate === "function") {
      await Analytics.findOneAndUpdate(
        { user: req.user._id },
        { cohort: cohortId },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn("Analytics cohort update warn:", err.message);
  }

  res.json({
    success: true,
    message: `Cohort "${cohort.name}" selected!`,
    data: { user: user.toPublicJSON() },
  });
};

// GET /api/users/students (staff only)
const getAllStudents = async (req, res) => {
  const { cohort, department, search, page = 1, limit = 20 } = req.query;
  const filter = { role: "student" };
  if (cohort)     filter.cohort     = cohort;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -refreshToken")
    .populate("cohort", "name slug icon")
    .sort({ createdAt: -1 })
    .skip(skip).limit(Number(limit))
    .lean();
  res.json({ success: true, data: { users, pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) } } });
};

// POST /api/users/upload-resume
const uploadResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { resumeUrl: req.file.path, resumePublicId: req.file.filename },
    { new: true }
  );
  res.json({ success: true, message: "Resume uploaded!", data: { resumeUrl: user.resumeUrl } });
};

// GET /api/users/students/:id (staff only)
const getStudentById = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password -refreshToken")
    .populate("cohort", "name slug icon")
    .lean();
  if (!user) return res.status(404).json({ success: false, message: "Student not found" });
  res.json({ success: true, data: { user } });
};

module.exports = { getProfile, updateProfile, selectCohort, getAllStudents, uploadResume, getStudentById };