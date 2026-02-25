// ============================================================
//  middleware/auth.js  —  JWT Authentication Middleware
//
//  How it works:
//  1. Student logs in  →  server sends back an "access token"
//  2. Student sends that token in every future request header
//  3. This middleware checks the token before allowing access
//
//  Usage in routes:
//    router.get("/profile", protect, getProfile)
//    router.get("/analytics", protect, staffOnly, getAnalytics)
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── protect ───────────────────────────────────────────────
// Verifies the JWT token and attaches user to req.user
// Use this on any route that requires login

const protect = async (req, res, next) => {
  try {
    let token;

    // Token is sent in the "Authorization" header like:
    // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    // Verify token — throws error if expired or invalid
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Find the user from DB (confirm they still exist)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    // Attach user to the request so route handlers can use it
    // e.g. in a route handler: req.user._id, req.user.role
    req.user = user;
    next(); // move on to the actual route handler

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }
};

// ── staffOnly ─────────────────────────────────────────────
// Use AFTER protect to restrict a route to staff/admin only
// e.g. router.get("/students", protect, staffOnly, getAllStudents)

const staffOnly = (req, res, next) => {
  if (req.user.role === "staff" || req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Staff only.",
  });
};

// ── adminOnly ─────────────────────────────────────────────
// Even more restricted — admin only

const adminOnly = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin only.",
  });
};

// ── studentOnly ───────────────────────────────────────────
// For routes that should only be accessible by students

const studentOnly = (req, res, next) => {
  if (req.user.role === "student") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Students only.",
  });
};

module.exports = { protect, staffOnly, adminOnly, studentOnly };
