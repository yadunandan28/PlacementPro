require("dotenv").config();
const mongoose  = require("mongoose");

// Pre-load models
require("../../models/User");
require("../../models/Analytics");
require("../../models/Cohort");

const User      = require("../../models/User");
const Analytics = require("../../models/Analytics");
const { Cohort } = require("../../models/Cohort");

async function diagnose() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  const totalUsers    = await User.countDocuments();
  const totalStudents = await User.countDocuments({ role: "student" });
  const totalStaff    = await User.countDocuments({ role: "staff" });
  const totalCohorts  = await Cohort.countDocuments();
  const totalAnalytics= await Analytics.countDocuments();

  console.log("📊 DATABASE STATE:");
  console.log(`   Total users:     ${totalUsers}`);
  console.log(`   Students:        ${totalStudents}`);
  console.log(`   Staff/Admin:     ${totalStaff}`);
  console.log(`   Cohorts:         ${totalCohorts}`);
  console.log(`   Analytics docs:  ${totalAnalytics}`);

  const students = await User.find({ role: "student" }).select("name email rollNumber cohort").limit(5).lean();
  console.log("\n👥 FIRST 5 STUDENTS:");
  students.forEach(s => console.log(`   ${s.name} | ${s.email} | cohort: ${s.cohort || "NONE"}`));

  const analytics = await Analytics.find().select("user cohort overallScore").limit(5).lean();
  console.log("\n📈 FIRST 5 ANALYTICS:");
  analytics.forEach(a => console.log(`   user: ${a.user} | cohort: ${a.cohort} | score: ${a.overallScore}`));

  await mongoose.disconnect();
}

diagnose().catch(err => { console.error("❌", err.message); process.exit(1); });