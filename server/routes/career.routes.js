const express = require("express");
const { protect } = require("../middleware/auth");
const {
  recommendJobs,
  getSkillGap,
} = require("../controllers/career.controller");

const router = express.Router();

router.use(protect);
router.post("/recommend", recommendJobs);
router.post("/skill-gap", getSkillGap);

module.exports = router;
