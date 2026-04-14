const asyncHandler = require("express-async-handler");

const SERVICE_URL =
  process.env.CAREER_AI_SERVICE_URL || "http://localhost:8000";
const SERVICE_TOKEN = process.env.CAREER_AI_SERVICE_TOKEN || "";

async function callCareerService(path, payload) {
  const headers = { "Content-Type": "application/json" };
  if (SERVICE_TOKEN) headers["x-service-token"] = SERVICE_TOKEN;

  const response = await fetch(`${SERVICE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = json?.detail || json?.message || "Career AI service error";
    const err = new Error(msg);
    err.statusCode = response.status;
    throw err;
  }
  return json;
}

const recommendJobs = asyncHandler(async (req, res) => {
  const userSkills = Array.isArray(req.body?.userSkills)
    ? req.body.userSkills
    : Array.isArray(req.user?.skills)
      ? req.user.skills
      : [];

  const payload = {
    user_skills: userSkills,
    desired_role: req.body?.desiredRole || "",
    top_k: Number(req.body?.topK) || 8,
    min_score: Number(req.body?.minScore) || 0,
    use_embeddings: Boolean(req.body?.useEmbeddings),
  };

  const result = await callCareerService("/recommend", payload);
  res.json({
    success: true,
    data: {
      ...result.data,
      userSkills,
    },
  });
});

const getSkillGap = asyncHandler(async (req, res) => {
  const userSkills = Array.isArray(req.body?.userSkills)
    ? req.body.userSkills
    : Array.isArray(req.user?.skills)
      ? req.user.skills
      : [];

  if (!req.body?.jobId) {
    return res
      .status(400)
      .json({ success: false, message: "jobId is required" });
  }

  const result = await callCareerService("/skill-gap", {
    user_skills: userSkills,
    job_id: req.body.jobId,
  });

  res.json({ success: true, data: result.data });
});

module.exports = { recommendJobs, getSkillGap };
