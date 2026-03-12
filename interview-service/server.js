require("dotenv").config();

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");

const required = ["MONGO_URI", "JWT_ACCESS_SECRET", "GROQ_API_KEY"];
const missing  = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error("❌  Missing .env variables:", missing.join(", "));
  process.exit(1);
}

// Pre-load models (User MUST come first — InterviewSlot refs it)
require("./models/User");
require("./models/InterviewSlot");
require("./models/InterviewSession");

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.CLIENT_URL || "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/interview", require("./routes/interview.routes"));

app.get("/health", (_req, res) => res.json({
  success: true,
  message: "PlacementPro Interview Service ✅",
  time:    new Date().toISOString(),
}));

app.use("*", (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

app.use((err, _req, res, _next) => {
  console.error("❌", err.message);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    require("./utils/recordingCleanup").startCleanupCron();
    app.listen(PORT, () => {
      console.log(`✅  Interview Service → http://localhost:${PORT}`);
      console.log(`✅  Health           → http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error("❌  MongoDB failed:", err.message);
    process.exit(1);
  });