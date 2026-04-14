const asyncHandler = require("express-async-handler");
const { cloudinary } = require("../config/cloudinary");
const { parsePdfBuffer } = require("../utils/jdPdf.util");
const {
  extractFocusAreas,
  generatePreparationPlan,
} = require("../services/jdAi.service");
const InterviewPrep = require("../models/InterviewPrep");

const MAX_PLANS_PER_USER = 15;

function toPublicDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.extractedText;
  return o;
}

const listPreps = asyncHandler(async (req, res) => {
  const items = await InterviewPrep.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select("-extractedText")
    .lean();
  res.json({ success: true, data: { preparations: items } });
});

const getPrep = asyncHandler(async (req, res) => {
  const prep = await InterviewPrep.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("-extractedText");

  if (!prep) {
    return res
      .status(404)
      .json({ success: false, message: "Preparation not found" });
  }

  res.json({ success: true, data: { preparation: prep } });
});

const uploadPrep = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No PDF file uploaded" });
  }

  const count = await InterviewPrep.countDocuments({ user: req.user._id });
  if (count >= MAX_PLANS_PER_USER) {
    return res.status(400).json({
      success: false,
      message: `You can track up to ${MAX_PLANS_PER_USER} job descriptions. Remove one to add another.`,
    });
  }

  let cloudinaryResult;
  try {
    cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "placementpro/jds",
          format: "pdf",
          public_id: `prep_${req.user._id}_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload PDF" });
  }

  let extractedText = "";
  try {
    extractedText = await parsePdfBuffer(req.file.buffer);
  } catch (err) {
    console.error("PDF parse failed:", err.message);
    return res.status(400).json({
      success: false,
      message: "Could not read PDF. Use a valid text-based PDF.",
    });
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return res.status(400).json({
      success: false,
      message: "PDF appears empty or image-only. Upload a text-based PDF.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      success: false,
      message: "AI features are not configured on the server.",
    });
  }

  const focusAreas = await extractFocusAreas(extractedText);

  const prep = await InterviewPrep.create({
    user: req.user._id,
    originalName: req.file.originalname,
    cloudinaryUrl: cloudinaryResult.secure_url,
    cloudinaryId: cloudinaryResult.public_id,
    extractedText,
    focusAreas,
    planStatus: "uploaded",
    preparationPlan: {
      phases: [],
      interviewTips: [],
      topicsToDrill: [],
    },
  });

  res.status(201).json({
    success: true,
    data: {
      preparation: toPublicDoc(prep),
      message: "JD added. Generate a preparation plan when you're ready.",
    },
  });
});

const generatePlan = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res
      .status(503)
      .json({ success: false, message: "AI service not configured." });
  }

  const prep = await InterviewPrep.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!prep) {
    return res
      .status(404)
      .json({ success: false, message: "Preparation not found" });
  }

  if (prep.planStatus === "generating") {
    return res
      .status(409)
      .json({ success: false, message: "Plan is already being generated." });
  }

  prep.planStatus = "generating";
  prep.planError = undefined;
  await prep.save();

  try {
    const result = await generatePreparationPlan(
      prep.extractedText,
      prep.focusAreas,
    );

    prep.roleSummary = result.roleSummary || prep.roleSummary;
    prep.preparationPlan = {
      timelineWeeks: result.timelineWeeks,
      phases: result.phases || [],
      interviewTips: result.interviewTips || [],
      topicsToDrill: result.topicsToDrill || [],
    };
    prep.planStatus = "ready";
    prep.planGeneratedAt = new Date();
    await prep.save();

    const fresh = await InterviewPrep.findById(prep._id).select(
      "-extractedText",
    );
    res.json({
      success: true,
      data: {
        preparation: fresh,
        message: "Your preparation plan is ready.",
      },
    });
  } catch (err) {
    console.error("generatePlan:", err.message);
    prep.planStatus = "failed";
    prep.planError = err.message || "Plan generation failed";
    await prep.save();
    res.status(500).json({
      success: false,
      message: prep.planError,
    });
  }
});

const toggleTask = asyncHandler(async (req, res) => {
  const { id, phaseId, taskId } = req.params;
  const done = Boolean(req.body?.done);

  const prep = await InterviewPrep.findOne({ _id: id, user: req.user._id });
  if (!prep) {
    return res
      .status(404)
      .json({ success: false, message: "Preparation not found" });
  }

  const phase = prep.preparationPlan?.phases?.id(phaseId);
  if (!phase) {
    return res.status(404).json({ success: false, message: "Phase not found" });
  }

  const task = phase.tasks.id(taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }

  task.done = done;
  await prep.save();

  const fresh = await InterviewPrep.findById(prep._id).select("-extractedText");
  res.json({ success: true, data: { preparation: fresh } });
});

const deletePrep = asyncHandler(async (req, res) => {
  const prep = await InterviewPrep.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!prep) {
    return res
      .status(404)
      .json({ success: false, message: "Preparation not found" });
  }

  if (prep.cloudinaryId) {
    try {
      await cloudinary.uploader.destroy(prep.cloudinaryId, {
        resource_type: "raw",
      });
    } catch (e) {
      console.warn("Cloudinary delete:", e.message);
    }
  }

  await prep.deleteOne();
  res.json({ success: true, message: "Removed." });
});

module.exports = {
  listPreps,
  getPrep,
  uploadPrep,
  generatePlan,
  toggleTask,
  deletePrep,
};
