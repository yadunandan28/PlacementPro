// routes/submission.routes.js

const express    = require("express");
const router     = express.Router();
const { protect } = require("../middleware/auth");
const { validateMCQSubmission, validateCodeSubmission } = require("../middleware/validate");
const { submitMCQ, submitCode, getMySubmissions } = require("../controllers/submission.controller");

router.use(protect);

router.post("/mcq",  validateMCQSubmission,  submitMCQ);
router.post("/code", validateCodeSubmission, submitCode);
router.get( "/my",                           getMySubmissions);

module.exports = router;
