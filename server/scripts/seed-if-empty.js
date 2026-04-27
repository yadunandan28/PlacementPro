require("dotenv").config();
const { spawnSync } = require("child_process");
const mongoose = require("mongoose");

async function main() {
  if (!process.env.MONGO_URI) {
    console.warn("seed-if-empty: MONGO_URI missing, skipping seed check.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const User = require("../models/User");
    const { Cohort } = require("../models/Cohort");
    const Question = require("../models/Question");

    const [userCount, cohortCount, questionCount] = await Promise.all([
      User.countDocuments(),
      Cohort.countDocuments(),
      Question.countDocuments(),
    ]);

    const shouldSeed =
      userCount === 0 || cohortCount === 0 || questionCount === 0;
    if (!shouldSeed) {
      console.log("seed-if-empty: data exists, skipping seed:all.");
      return;
    }

    console.log("seed-if-empty: empty DB detected, running seed:all...");
    await mongoose.disconnect();

    const result = spawnSync("npm", ["run", "seed:all"], {
      stdio: "inherit",
      env: process.env,
    });

    if (result.status !== 0) {
      throw new Error(`seed:all failed with exit code ${result.status}`);
    }
    console.log("seed-if-empty: seed:all completed.");
  } catch (err) {
    console.error("seed-if-empty:", err.message);
    process.exit(1);
  } finally {
    try {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    } catch {}
  }
}

main();
