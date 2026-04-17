const express = require("express");
const multer = require("multer");
const { protect, staffOnly, studentOnly } = require("../middleware/auth");
const {
  uploadStaffJD,
  listStaffCampaigns,
  assignCampaign,
  getMyTrainings,
  updateTrainingTask,
  markTrainingNotificationRead,
} = require("../controllers/training.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

router.use(protect);

router.get("/my", studentOnly, getMyTrainings);
router.patch(
  "/my/:enrollmentId/phases/:phaseId/tasks/:taskId",
  studentOnly,
  updateTrainingTask,
);
router.patch(
  "/my/:enrollmentId/read",
  studentOnly,
  markTrainingNotificationRead,
);

router.get("/staff/campaigns", staffOnly, listStaffCampaigns);
router.post("/staff/upload-jd", staffOnly, upload.single("jd"), uploadStaffJD);
router.post("/staff/campaigns/:id/assign", staffOnly, assignCampaign);

module.exports = router;
