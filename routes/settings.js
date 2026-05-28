const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getEmailSettings,
  saveEmailSettings,
  getSchoolSettings,
  saveSchoolSettings
} = require("../controllers/adminSettingsController");
const {
  getIntegrationSettings,
  saveIntegrationSettings,
  testPaystackConnection,
  testSmtpConnection
} = require("../controllers/adminIntegrationsController");

const router = Router();

// Configure Multer for School Assets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === 'logo') {
      uploadDir = path.join(__dirname, "..", "uploads", "school");
    } else {
      uploadDir = path.join(__dirname, "..", "uploads", "signatures");
    }
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'logo' ? 'school-logo' : file.fieldname;
    cb(null, prefix + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|svg\+xml)$/)) {
      return cb(new Error("Only JPG, PNG and SVG files are allowed"), false);
    }
    cb(null, true);
  }
});

router.get("/email", getEmailSettings);
router.post("/email", saveEmailSettings);

router.get("/school", getSchoolSettings);
router.post(
  "/school", 
  upload.fields([
    { name: 'logo', maxCount: 1 }, 
    { name: 'registrarSignature', maxCount: 1 }, 
    { name: 'principalSignature', maxCount: 1 }
  ]), 
  saveSchoolSettings
);

router.get("/integrations", getIntegrationSettings);
router.post("/integrations", saveIntegrationSettings);
router.post("/integrations/paystack/test", testPaystackConnection);
router.post("/integrations/smtp/test", testSmtpConnection);

module.exports = router;
