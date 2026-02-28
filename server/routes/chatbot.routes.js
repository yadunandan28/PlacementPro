const express  = require("express");
const multer   = require("multer");
const { protect } = require("../middleware/auth");
const {
  uploadJD,
  chat,
  getSession,
  clearSession,
} = require("../controllers/chatbot.controller");

const router = express.Router();

// ── Multer config — store PDF in memory (then upload to Cloudinary) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// All routes require login
router.use(protect);

// POST /api/chatbot/upload-jd   — upload & analyze JD PDF
router.post("/upload-jd", upload.single("jd"), uploadJD);

// POST /api/chatbot/chat        — send a message
router.post("/chat", chat);

// GET  /api/chatbot/session     — get active session (focus areas + history)
router.get("/session", getSession);

// DELETE /api/chatbot/session   — clear session, ready for new JD
router.delete("/session", clearSession);

module.exports = router;