// Removes all demo students created by seedAll.js
// Keeps: staff, admin, and any real student accounts
require("dotenv").config();
const mongoose = require("mongoose");
require("../../models/User");
require("../../models/Analytics");
const User      = require("../../models/User");
const Analytics = require("../../models/Analytics");

const SEEDED_EMAILS = [
  "priya.22cs001@kct.ac.in","rahul.22cs002@kct.ac.in","sneha.22cs003@kct.ac.in",
  "karthik.22cs004@kct.ac.in","divya.22cs005@kct.ac.in","arjun.22cs006@kct.ac.in",
  "meera.22cs007@kct.ac.in","vikram.22cs008@kct.ac.in","ananya.22cs009@kct.ac.in",
  "suresh.22cs010@kct.ac.in","lakshmi.22cs011@kct.ac.in","rohan.22cs012@kct.ac.in",
  "pooja.22cs013@kct.ac.in","nikhil.22cs014@kct.ac.in","shalini.22cs015@kct.ac.in",
  "deepak.22cs016@kct.ac.in","kavitha.22cs017@kct.ac.in","harish.22cs018@kct.ac.in",
  "revathi.22cs019@kct.ac.in","ajay.22cs020@kct.ac.in","nisha.22cs021@kct.ac.in",
  "santhosh.22cs022@kct.ac.in","parvathy.22cs023@kct.ac.in","vignesh.22cs024@kct.ac.in",
  "aarti.22cs025@kct.ac.in","sriram.22cs026@kct.ac.in","geetha.22cs027@kct.ac.in",
  "praveen.22cs028@kct.ac.in","amala.22cs029@kct.ac.in","roshan.22cs030@kct.ac.in",
];

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  const users = await User.find({ email: { $in: SEEDED_EMAILS } }).select("_id email").lean();
  if (users.length === 0) { console.log("No seeded students found."); process.exit(0); }

  const ids = users.map(u => u._id);
  const { deletedCount: analyticsDeleted } = await Analytics.deleteMany({ user: { $in: ids } });
  const { deletedCount: usersDeleted }     = await User.deleteMany({ _id: { $in: ids } });

  console.log(`🗑️  Removed ${usersDeleted} seeded students`);
  console.log(`🗑️  Removed ${analyticsDeleted} analytics records`);
  console.log("\n✅ Done! Only real student accounts remain.\n");
  await mongoose.disconnect();
}

cleanup().catch(err => { console.error("❌", err.message); process.exit(1); });