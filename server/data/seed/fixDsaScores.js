// Recalculates DSA scores for all existing students based on codePassed count
require("dotenv").config();
const mongoose = require("mongoose");
require("../../models/User");
require("../../models/Analytics");
require("../../models/Question");
const Analytics = require("../../models/Analytics");
const Question  = require("../../models/Question");

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  const totalProblems = await Question.countDocuments({ type: "coding", isActive: true });
  console.log(`Total coding problems: ${totalProblems}`);

  const all = await Analytics.find({ codePassed: { $gt: 0 } });
  console.log(`Students with coding submissions: ${all.length}`);

  for (const a of all) {
    const oldDsa = a.dsaScore;
    a.dsaScore = Math.min(100, Math.round((a.codePassed / totalProblems) * 100));
    a.recalculateOverall();
    await a.save();
    console.log(`  Updated user ${a.user}: DSA ${oldDsa}% → ${a.dsaScore}%, Overall → ${a.overallScore}%`);
  }

  console.log("\n✅ DSA scores fixed!");
  await mongoose.disconnect();
}
fix().catch(err => { console.error("❌", err.message); process.exit(1); });