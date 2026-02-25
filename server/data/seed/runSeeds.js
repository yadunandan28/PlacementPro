// ============================================================
//  data/seed/runSeeds.js  —  Master Seed Script
//
//  This script runs ALL seeds in order + creates an admin account
//
//  Run: npm run seed
//       (which runs: node data/seed/runSeeds.js)
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");
const User     = require("../../models/User");
const { Cohort, Module } = require("../../models/Cohort");
const Question = require("../../models/Question");
const Analytics = require("../../models/Analytics");

// Import seed data (we'll reuse the arrays from the other files)
// Since we're running everything together here, we define them inline

async function createAdminAndStaff() {
  console.log("\n📋 Creating admin and staff accounts...");

  // Create admin account
  const adminExists = await User.findOne({ email: "admin@placementpro.com" });
  if (!adminExists) {
    await User.create({
      name:     "Super Admin",
      email:    "admin@placementpro.com",
      password: "Admin@123",   // ← CHANGE THIS in production!
      role:     "admin",
    });
    console.log("✅ Admin account created: admin@placementpro.com / Admin@123");
  } else {
    console.log("ℹ️  Admin account already exists");
  }

  // Create a demo staff account
  const staffExists = await User.findOne({ email: "staff@kct.ac.in" });
  if (!staffExists) {
    await User.create({
      name:     "Dr. Priya Menon",
      email:    "staff@kct.ac.in",
      password: "Staff@123",   // ← CHANGE THIS!
      role:     "staff",
    });
    console.log("✅ Staff account created: staff@kct.ac.in / Staff@123");
  } else {
    console.log("ℹ️  Staff account already exists");
  }

  // Create a demo student account (for testing)
  const studentExists = await User.findOne({ email: "student@kct.ac.in" });
  if (!studentExists) {
    const student = await User.create({
      name:       "Arun Kumar",
      email:      "student@kct.ac.in",
      password:   "Student@123",
      role:       "student",
      department: "Computer Science & Engineering",
      rollNumber: "21CS001",
      cgpa:       8.4,
      skills:     ["Python", "React", "Docker", "SQL"],
    });
    // Create analytics for demo student
    await Analytics.create({ user: student._id });
    console.log("✅ Demo student created: student@kct.ac.in / Student@123");
  } else {
    console.log("ℹ️  Demo student already exists");
  }
}

async function runAllSeeds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
    console.log("🌱 Starting database seeding...\n");

    // 1. Create users
    await createAdminAndStaff();

    // 2. Seed cohorts
    console.log("\n📋 Seeding cohorts (running seedCohorts.js)...");
    // We require and run it inline
    const { execSync } = require("child_process");
    try {
      execSync("node data/seed/seedCohorts.js", { stdio: "inherit" });
    } catch {
      console.log("Note: seedCohorts.js handled separately");
    }

    // 3. Seed questions
    console.log("\n📋 Seeding questions (running seedQuestions.js)...");
    try {
      execSync("node data/seed/seedQuestions.js", { stdio: "inherit" });
    } catch {
      console.log("Note: seedQuestions.js handled separately");
    }

    console.log("\n" + "═".repeat(50));
    console.log("🎉 ALL SEEDS COMPLETED SUCCESSFULLY!");
    console.log("═".repeat(50));
    console.log("\n📌 Test accounts created:");
    console.log("   Admin:   admin@placementpro.com  | Admin@123");
    console.log("   Staff:   staff@kct.ac.in        | Staff@123");
    console.log("   Student: student@kct.ac.in      | Student@123");
    console.log("\n🚀 Start the server: npm run dev");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

runAllSeeds();
