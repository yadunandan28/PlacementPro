// ============================================================
//  middleware/validate.js  —  Input Validation
//
//  Uses express-validator to check request body fields
//  before they reach the controller
//
//  Usage in routes:
//    router.post("/register", validateRegister, register)
// ============================================================

const { body, validationResult } = require("express-validator");

// ── Helper: run validation and return errors ───────────────
// Put this as the LAST item in the validation chain
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first error message found
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// ── Register Validation ────────────────────────────────────
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

  body("department")
    .optional()
    .isIn([
      "Computer Science & Engineering",
      "Information Technology",
      "Electronics & Communication",
      "Electrical Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
    ])
    .withMessage("Invalid department"),

  handleValidationErrors,
];

// ── Login Validation ───────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),

  body("password")
    .notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// ── Update Profile Validation ──────────────────────────────
const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),

  body("cgpa")
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage("CGPA must be between 0 and 10"),

  body("skills")
    .optional()
    .isArray().withMessage("Skills must be an array"),

  body("rollNumber")
    .optional()
    .trim(),

  handleValidationErrors,
];

// ── MCQ Submission Validation ──────────────────────────────
const validateMCQSubmission = [
  body("questionId")
    .notEmpty().withMessage("Question ID is required")
    .isMongoId().withMessage("Invalid question ID"),

  body("selectedOption")
    .notEmpty().withMessage("Selected option is required")
    .isInt({ min: 0, max: 3 }).withMessage("Option must be 0, 1, 2, or 3"),

  handleValidationErrors,
];

// ── Code Submission Validation ─────────────────────────────
const validateCodeSubmission = [
  body("questionId")
    .notEmpty().withMessage("Question ID is required")
    .isMongoId().withMessage("Invalid question ID"),

  body("code")
    .notEmpty().withMessage("Code is required")
    .isLength({ max: 50000 }).withMessage("Code is too long"),

  body("language")
    .notEmpty().withMessage("Language is required")
    .isIn(["python", "javascript", "java", "cpp", "c"])
    .withMessage("Unsupported language"),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateMCQSubmission,
  validateCodeSubmission,
};
