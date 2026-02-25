const express      = require("express");
const router       = express.Router();
const asyncHandler = require("express-async-handler");
const { protect, staffOnly } = require("../middleware/auth");
const {
  getMyAnalytics, getPlatformOverview, getCohortAnalytics,
  getAllStudentsAnalytics, getStudentDetail, exportReport,
} = require("../controllers/analytics.controller");

router.get("/me",                  protect,            asyncHandler(getMyAnalytics));
router.get("/overview",            protect, staffOnly, asyncHandler(getPlatformOverview));
router.get("/cohort/:cohortId",    protect, staffOnly, asyncHandler(getCohortAnalytics));
router.get("/students",            protect, staffOnly, asyncHandler(getAllStudentsAnalytics));
router.get("/students/:studentId", protect, staffOnly, asyncHandler(getStudentDetail));
router.get("/export",              protect, staffOnly, asyncHandler(exportReport));

module.exports = router;