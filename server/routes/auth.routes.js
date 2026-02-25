// ============================================================
//  routes/auth.routes.js  —  Authentication Routes
//
//  A route file connects a URL path to a controller function
//  Route = URL path + HTTP method + middleware + controller
// ============================================================

const express = require("express");
const router  = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  createStaff,
} = require("../controllers/auth.controller");

const { protect, adminOnly } = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validate");

// Public routes (no login needed)
router.post("/register", validateRegister, register);
router.post("/login",    validateLogin,    login);
router.post("/refresh",                   refreshToken);

// Protected routes (must be logged in)
router.get( "/me",     protect, getMe);
router.post("/logout", protect, logout);

// Admin-only route (create staff accounts)
router.post("/create-staff", protect, adminOnly, createStaff);

module.exports = router;
