const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
  listPreps,
  getPrep,
  uploadPrep,
  generatePlan,
  toggleTask,
  deletePrep,
} = require("../controllers/interviewPrep.controller");

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

router.get("/", listPreps);
router.get("/:id", getPrep);
router.post("/upload", upload.single("jd"), uploadPrep);
router.post("/:id/generate-plan", generatePlan);
router.patch("/:id/phases/:phaseId/tasks/:taskId", toggleTask);
router.delete("/:id", deletePrep);

module.exports = router;
