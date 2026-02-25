// routes/user.routes.js

const express = require("express");
const router  = express.Router();

const {
  getProfile,
  updateProfile,
  uploadResume,
  selectCohort,
  getAllStudents,
  getStudentById,
} = require("../controllers/user.controller");

const { protect, staffOnly }      = require("../middleware/auth");
const { validateUpdateProfile }   = require("../middleware/validate");
const { uploadResume: resumeUpload } = require("../config/cloudinary");

// All routes require login
router.use(protect);

// Student routes
router.get( "/profile",       getProfile);
router.put( "/profile",       validateUpdateProfile, updateProfile);
router.post("/upload-resume", resumeUpload.single("resume"), uploadResume);
router.post("/select-cohort", selectCohort);

// Staff-only routes
router.get("/students",     staffOnly, getAllStudents);
router.get("/students/:id", staffOnly, getStudentById);

module.exports = router;
