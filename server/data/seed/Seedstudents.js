// ============================================================
//  data/seed/seedStudents.js
//  Creates demo student accounts with analytics data
//  so staff dashboard has something to show
// ============================================================
require("dotenv").config();
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const User      = require("../../models/User");
const Analytics = require("../../models/Analytics");
const { Cohort } = require("../../models/Cohort");

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
];

const NAMES = [
  "Arun Kumar","Priya Sharma","Rahul Verma","Sneha Patel","Karthik Rajan",
  "Divya Menon","Arjun Singh","Meera Nair","Vikram Reddy","Ananya Iyer",
  "Suresh Babu","Lakshmi Devi","Rohan Gupta","Pooja Krishnan","Nikhil Tiwari",
  "Shalini Rao","Deepak Pillai","Kavitha Mohan","Harish Naik","Revathi Subramanian",
  "Ajay Chandran","Nisha Varma","Santhosh Kumar","Parvathy Nair","Vignesh Murugan",
  "Aarti Balan","Sriram Venkat","Geetha Raman","Praveen Das","Amala George",
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const cohorts = await Cohort.find({ isActive: true }).lean();
  if (cohorts.length === 0) {
    console.log("❌ No cohorts found. Run seedCohorts.js first.");
    process.exit(1);
  }
  console.log(`✅ Found ${cohorts.length} cohorts`);

  const password = await bcrypt.hash("Student@123", 12);
  let created = 0, skipped = 0;

  for (let i = 0; i < NAMES.length; i++) {
    const name       = NAMES[i];
    const roll       = `22CS${String(i + 1).padStart(3, "0")}`;
    const email      = `${name.split(" ")[0].toLowerCase()}.${roll.toLowerCase()}@kct.ac.in`;
    const cohort     = cohorts[i % cohorts.length];
    const dept       = DEPARTMENTS[i % DEPARTMENTS.length];
    const cgpa       = parseFloat((6.5 + Math.random() * 3).toFixed(1));

    const exists = await User.findOne({ email });
    if (exists) { skipped++; continue; }

    const user = await User.create({
      name, email, password: "Student@123", role: "student",
      department: dept, rollNumber: roll, cgpa,
      cohort: cohort._id,
      skills: ["Python", "SQL", "JavaScript"].slice(0, 1 + (i % 3)),
    });

    // Create analytics with varied scores to make dashboard interesting
    const dsaScore  = Math.floor(20 + Math.random() * 75);
    const osScore   = Math.floor(15 + Math.random() * 80);
    const dbmsScore = Math.floor(20 + Math.random() * 75);
    const cnScore   = Math.floor(10 + Math.random() * 80);
    const scores    = [dsaScore, osScore, dbmsScore, cnScore].filter(s => s > 0);
    const overall   = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    await Analytics.create({
      user:    user._id,
      cohort:  cohort._id,
      dsaScore, osScore, dbmsScore, cnScore,
      overallScore: overall,
      dsaAttempts:  Math.floor(1 + Math.random() * 5),
      osAttempts:   Math.floor(1 + Math.random() * 4),
      dbmsAttempts: Math.floor(1 + Math.random() * 4),
      cnAttempts:   Math.floor(1 + Math.random() * 3),
      codePassed:   Math.floor(Math.random() * 5),
      easyPassed:   Math.floor(Math.random() * 3),
      mediumPassed: Math.floor(Math.random() * 2),
      hardPassed:   Math.floor(Math.random() * 1),
      totalCodeSubmissions: Math.floor(1 + Math.random() * 8),
    });

    created++;
    console.log(`   ✅ ${name} (${cohort.name}) — Overall: ${overall}%`);
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped (already exist): ${skipped}`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error("❌", err.message); process.exit(1); });