// ============================================================
//  utils/generateToken.js  —  JWT Token Generator
//
//  Access token:  short-lived (15 min), used for API calls
//  Refresh token: long-lived (7 days), used to get new access token
// ============================================================

const jwt = require("jsonwebtoken");

// Generate ACCESS token — expires in 15 minutes
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },              // payload stored inside the token
    process.env.JWT_ACCESS_SECRET,     // secret key to sign with
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m" }
  );
};

// Generate REFRESH token — expires in 7 days
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
  );
};

// Generate both tokens at once (used at login)
const generateTokens = (userId, role) => {
  const accessToken  = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

module.exports = { generateAccessToken, generateRefreshToken, generateTokens };
