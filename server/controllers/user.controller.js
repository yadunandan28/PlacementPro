// ============================================================
//  controllers/user.controller.js  —  User / Profile Logic
// ============================================================

const User      = require("../models/User");
const Analytics = require("../models/Analytics");
const { Cohort } = require("../models/Cohort");
const { cloudinary } = require("../config/cloudinary");

// ── GET MY PROFILE ────────────────────────────────────────
// GET /api/users/profile

const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("cohort",           "name slug icon color tags")
    .populate("completedModules", "title order");

  res.json({ success: true, data: { user: user.toPublicJSON() } });
};

// ── UPDATE PROFILE ────────────────────────────────────────
// PUT /api/users/profile
// Body: { name?, cgpa?, skills?, rollNumber?, department? }

const updateProfile = async (req, res) => {
  const { name, cgpa, skills, rollNumber, department } = req.body;

  // Build the update object — only include fields that were sent
  const updateData = {};
  if (name)        updateData.name        = name;
  if (cgpa !== undefined) updateData.cgpa = cgpa;
  if (skills)      updateData.skills      = skills;
  if (rollNumber)  updateData.rollNumber  = rollNumber;
  if (department)  updateData.department  = department;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    {
      new:            true,   // return updated doc
      runValidators:  true,   // run schema validation on update
    }
  ).populate("cohort", "name slug icon");

  res.json({
    success: true,
    message: "Profile updated successfully",
    data:    { user: user.toPublicJSON() },
  });
};

// ── UPLOAD RESUME ─────────────────────────────────────────
// POST /api/users/upload-resume
// Form-data: { resume: <pdf file> }

const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Delete old resume from Cloudinary if it exists
  const user = await User.findById(req.user._id);
  if (user.resumePublicId) {
    await cloudinary.uploader.destroy(user.resumePublicId, { resource_type: "raw" });
  }

  // Save new resume URL (Cloudinary already uploaded via multer middleware)
  user.resumeUrl      = req.file.path;        // Cloudinary URL
  user.resumePublicId = req.file.filename;    // Cloudinary public_id (for deletion)
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: "Resume uploaded successfully",
    data:    { resumeUrl: user.resumeUrl },
  });
};

// ── SELECT COHORT ─────────────────────────────────────────
// POST /api/users/select-cohort
// Body: { cohortId }

const selectCohort = async (req, res) => {
  const { cohortId } = req.body;

  // Verify cohort exists
  const cohort = await Cohort.findById(cohortId);
  if (!cohort) {
    return res.status(404).json({ success: false, message: "Cohort not found" });
  }

  // Update student's cohort
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { cohort: cohortId },
    { new: true }
  ).populate("cohort", "name slug icon color");

  // Also update their analytics record
  await Analytics.findOneAndUpdate(
    { user: req.user._id },
    { cohort: cohortId }
  );

  res.json({
    success: true,
    message: `Cohort "${cohort.name}" selected!`,
    data:    { user: user.toPublicJSON() },
  });
};

// ── GET ALL STUDENTS (staff only) ────────────────────────
// GET /api/users/students?cohort=&department=&search=

const getAllStudents = async (req, res) => {
  const { cohort, department, search, page = 1, limit = 20 } = req.query;

  // Build MongoDB query filter
  const filter = { role: "student" };

  if (cohort)     filter.cohort     = cohort;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: "i" } }, // case-insensitive search
      { email:       { $regex: search, $options: "i" } },
      { rollNumber:  { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);

  const students = await User.find(filter)
    .populate("cohort", "name slug icon")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .select("-password -refreshToken");

  res.json({
    success: true,
    data: {
      students,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

// ── GET ONE STUDENT (staff only) ─────────────────────────
// GET /api/users/students/:id

const getStudentById = async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: "student" })
    .populate("cohort",           "name slug icon color")
    .populate("completedModules", "title order");

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  // Also get their analytics
  const analytics = await Analytics.findOne({ user: student._id });

  res.json({
    success: true,
    data: { student: student.toPublicJSON(), analytics },
  });
};

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  selectCohort,
  getAllStudents,
  getStudentById,
};
