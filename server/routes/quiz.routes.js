const express = require("express");
const router = express.Router();
const { protect, staffOnly, studentOnly } = require("../middleware/auth");
const {
  createQuiz,
  listStaffQuizzes,
  getStaffQuiz,
  getQuizResults,
  scheduleQuiz,
  rescheduleQuiz,
  startQuizManually,
  endQuiz,
  updateAssignedStudents,
  deleteQuiz,
  regenerateQuestion,
  approveQuiz,
  getMyQuizzes,
  startAttempt,
  submitQuiz,
  getMyResult,
} = require("../controllers/quiz.controller");

router.use(protect);

// ── Student ────────────────────────────────────────────────
router.get("/my", studentOnly, getMyQuizzes);
router.post("/:id/start", studentOnly, startAttempt);
router.post("/:id/submit", studentOnly, submitQuiz);
router.get("/:id/my-result", studentOnly, getMyResult);

// ── Staff ──────────────────────────────────────────────────
router.post("/staff/create", staffOnly, createQuiz);
router.get("/staff", staffOnly, listStaffQuizzes);
router.get("/staff/:id", staffOnly, getStaffQuiz);
router.get("/staff/:id/results", staffOnly, getQuizResults);
router.patch("/staff/:id/schedule", staffOnly, scheduleQuiz);
router.patch("/staff/:id/reschedule", staffOnly, rescheduleQuiz);
router.patch("/staff/:id/start", staffOnly, startQuizManually);
router.patch("/staff/:id/end", staffOnly, endQuiz);
router.patch("/staff/:id/assign", staffOnly, updateAssignedStudents);
router.patch(
  "/staff/:id/questions/:qIdx/regenerate",
  staffOnly,
  regenerateQuestion,
);
router.patch("/staff/:id/approve", staffOnly, approveQuiz);
router.delete("/staff/:id", staffOnly, deleteQuiz);

module.exports = router;
