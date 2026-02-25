// ============================================================
//  config/cloudinary.js  —  File Upload (Cloudinary v1)
//  Uses cloudinary v1 which is compatible with multer-storage-cloudinary v4
// ============================================================

const cloudinary = require("cloudinary").v2;
const multer     = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "placeholder",
  api_key:    process.env.CLOUDINARY_API_KEY    || "placeholder",
  api_secret: process.env.CLOUDINARY_API_SECRET || "placeholder",
});

// Storage for resume PDFs
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "placementpro/resumes",
    allowed_formats: ["pdf"],
    resource_type:   "raw",
  },
});

// Storage for JD PDFs
const jdStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "placementpro/job-descriptions",
    allowed_formats: ["pdf"],
    resource_type:   "raw",
  },
});

const uploadResume = multer({
  storage: resumeStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Only PDFs allowed")),
});

const uploadJD = multer({
  storage: jdStorage,
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Only PDFs allowed")),
});

module.exports = { cloudinary, uploadResume, uploadJD };
