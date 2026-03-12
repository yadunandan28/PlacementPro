const express  = require("express");
const multer   = require("multer");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const mongoose = require("mongoose");

const {
  createSlot, getAllSlots, getMySlots,
  startInterview, transcribeAudio,
  submitVerbalAnswer, submitCodeAnswer, runCode,
  finishInterview, getResult, getAnalytics,
  uploadRecording, getRecordings,
} = require("../controllers/interview.controller");

// ── Auth middleware (same JWT as main server) ─────────────
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user      = { _id: decoded.id, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const staffOnly = (req, res, next) => {
  if (req.user.role === "staff" || req.user.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Staff only" });
};

// ── Audio upload (Whisper) ────────────────────────────────
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Audio files only"), false);
  },
});

// ── Video upload (Cloudinary) ─────────────────────────────
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 150 * 1024 * 1024 }, // 150MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Video/audio files only"), false);
  },
});

// ── Routes ────────────────────────────────────────────────

// Staff: manage slots
router.post("/slots",        protect, staffOnly, createSlot);
router.get("/slots",         protect, staffOnly, getAllSlots);
router.get("/analytics",     protect, staffOnly, getAnalytics);

// Student: their slots
router.get("/my-slots",      protect, getMySlots);

// Student: interview flow
router.post("/slots/:slotId/start",          protect, startInterview);
router.post("/transcribe",                   protect, audioUpload.single("audio"), transcribeAudio);
router.post("/sessions/:sessionId/verbal",   protect, submitVerbalAnswer);
router.post("/sessions/:sessionId/code",     protect, submitCodeAnswer);
router.post("/sessions/:sessionId/run-code", protect, runCode);
router.post("/sessions/:sessionId/finish",   protect, finishInterview);
router.get("/sessions/:sessionId/result",    protect, getResult);

// Video recordings
router.post("/sessions/:sessionId/upload-recording", protect, videoUpload.single("video"), uploadRecording);
router.get("/sessions/:sessionId/recordings",        protect, staffOnly, getRecordings);

module.exports = router;