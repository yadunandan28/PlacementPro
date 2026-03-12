// interview-service/utils/recordingCleanup.js
// Runs every hour. Finds recordings past their deleteAt date,
// removes them from Cloudinary, then clears the URL from MongoDB.

const cron       = require("node-cron");
const cloudinary = require("../config/cloudinary");
const InterviewSession = require("../models/InterviewSession");

async function deleteExpiredRecordings() {
  try {
    const now = new Date();

    // Find sessions that have at least one expired recording
    const sessions = await InterviewSession.find({
      "recordings.deleteAt": { $lte: now },
    });

    if (sessions.length === 0) return;

    console.log(`🧹 Cleanup: found ${sessions.length} session(s) with expired recordings`);

    for (const session of sessions) {
      let modified = false;

      for (const rec of session.recordings) {
        if (rec.deleteAt && rec.deleteAt <= now && rec.publicId) {
          try {
            await cloudinary.uploader.destroy(rec.publicId, { resource_type: "video" });
            console.log(`  ✅ Deleted Cloudinary video: ${rec.publicId}`);
          } catch (err) {
            console.warn(`  ⚠ Could not delete ${rec.publicId}:`, err.message);
          }
          // Clear the URL and publicId but keep the record (so staff knows recording existed)
          rec.cloudinaryUrl = "";
          rec.publicId      = "";
          rec.expired       = true;
          modified = true;
        }
      }

      if (modified) {
        session.markModified("recordings");
        await session.save();
      }
    }
  } catch (err) {
    console.error("❌ Recording cleanup error:", err.message);
  }
}

function startCleanupCron() {
  // Run every hour at :00
  cron.schedule("0 * * * *", () => {
    console.log("🕐 Running recording cleanup cron...");
    deleteExpiredRecordings();
  });

  // Also run once on startup (catches any missed deletions from downtime)
  deleteExpiredRecordings();
  console.log("✅ Recording cleanup cron started (runs every hour)");
}

module.exports = { startCleanupCron, deleteExpiredRecordings };