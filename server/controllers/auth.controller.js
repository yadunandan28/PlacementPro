// ============================================================
//  controllers/auth.controller.js
// ============================================================

const User      = require("../models/User");
const Analytics = require("../models/Analytics");
const { generateTokens, generateAccessToken } = require("../utils/generateToken");
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ── REGISTER ──────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password, department, rollNumber } = req.body;

  const allowedDomain = process.env.COLLEGE_EMAIL_DOMAIN || "college.edu";
  if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    return res.status(400).json({
      success: false,
      message: `Only college emails allowed. Use your @${allowedDomain} email.`,
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  const user = await User.create({
    name, email, password,
    department: department || "Computer Science & Engineering",
    rollNumber: rollNumber || "",
    role: "student",
  });

  // Create analytics record — ignore if already exists
  try {
    await Analytics.create({ user: user._id });
  } catch (err) {
    // duplicate key or other — not critical, analytics auto-created on first access
    if (err.code !== 11000) console.error("Analytics create warn:", err.message);
  }

  const { accessToken, refreshToken } = generateTokens(user._id, user.role);
  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    message: "Registration successful!",
    data: { user: user.toPublicJSON(), accessToken, refreshToken },
  });
};

// ── LOGIN ─────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });
  if (!user.isActive) return res.status(401).json({ success: false, message: "Account deactivated. Contact admin." });

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) return res.status(401).json({ success: false, message: "Invalid email or password" });

  user.lastLogin = new Date();
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);
  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  // Ensure analytics exists for this user
  try {
    const exists = await Analytics.findOne({ user: user._id });
    if (!exists) await Analytics.create({ user: user._id });
  } catch {}

  res.json({
    success: true,
    message: "Login successful!",
    data: { user: user.toPublicJSON(), accessToken, refreshToken },
  });
};

// ── REFRESH TOKEN ─────────────────────────────────────────
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(401).json({ success: false, message: "Refresh token required" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || !user.refreshToken) return res.status(401).json({ success: false, message: "Invalid session" });

  const isValid = await bcrypt.compare(token, user.refreshToken);
  if (!isValid) return res.status(401).json({ success: false, message: "Invalid refresh token" });

  const newAccessToken = generateAccessToken(user._id, user.role);
  res.json({ success: true, data: { accessToken: newAccessToken } });
};

// ── LOGOUT ────────────────────────────────────────────────
const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ success: true, message: "Logged out successfully" });
};

// ── GET CURRENT USER ──────────────────────────────────────
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate("cohort", "name slug icon color");
  res.json({ success: true, data: { user: user.toPublicJSON() } });
};

// ── CREATE STAFF (admin only) ─────────────────────────────
const createStaff = async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ success: false, message: "Email already exists" });
  const staff = await User.create({ name, email, password, role: "staff" });
  res.status(201).json({ success: true, message: "Staff account created", data: { user: staff.toPublicJSON() } });
};

module.exports = { register, login, refreshToken, logout, getMe, createStaff };