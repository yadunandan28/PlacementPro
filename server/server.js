require("dotenv").config();

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const required = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing  = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("\n❌  Missing .env variables:", missing.join(", "));
  process.exit(1);
}

// ── PRE-LOAD ALL MODELS before any route touches them ────
// This guarantees mongoose.model() is always available,
// regardless of require() order in controllers/routes.
require("./models/User");
require("./models/Analytics");
require("./models/Cohort");
require("./models/Question");
require("./models/Submission");

const app = express();

app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173","http://localhost:3000"], credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", rateLimit({ windowMs:15*60*1000, max:300,
  message:{ success:false, message:"Too many requests." } }));
app.use("/api/auth/login",    rateLimit({ windowMs:15*60*1000, max:20,
  message:{ success:false, message:"Too many login attempts." } }));
app.use("/api/auth/register", rateLimit({ windowMs:15*60*1000, max:10,
  message:{ success:false, message:"Too many register attempts." } }));

app.use("/api/auth",        require("./routes/auth.routes"));
app.use("/api/users",       require("./routes/user.routes"));
app.use("/api/cohorts",     require("./routes/cohort.routes"));
app.use("/api/questions",   require("./routes/question.routes"));
app.use("/api/submissions", require("./routes/submission.routes"));
app.use("/api/analytics",   require("./routes/analytics.routes"));

app.get("/health", (_req, res) => res.json({
  success:true, message:"PlacementPro API is running! ✅",
  time:new Date().toISOString(),
}));

app.use("*", (req, res) =>
  res.status(404).json({ success:false, message:`Route ${req.originalUrl} not found` })
);

app.use((err, _req, res, _next) => {
  console.error("❌", err.message);
  if (err.name === "ValidationError")
    return res.status(400).json({ success:false, message:Object.values(err.errors).map(e=>e.message).join(", ") });
  if (err.code === 11000)
    return res.status(400).json({ success:false, message:`${Object.keys(err.keyValue)[0]} already exists` });
  if (err.name === "JsonWebTokenError")
    return res.status(401).json({ success:false, message:"Invalid token" });
  if (err.name === "TokenExpiredError")
    return res.status(401).json({ success:false, message:"Token expired" });
  res.status(err.statusCode || 500).json({ success:false, message:err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅  Server → http://localhost:${PORT}`);
      console.log(`✅  Health → http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });