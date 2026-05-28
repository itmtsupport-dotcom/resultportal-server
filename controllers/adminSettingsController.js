const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { EmailSettings, SchoolSettings, Setting } = require("../models");
const fs = require("fs");
const path = require("path");

const getSchoolSettings = async (req, res, next) => {
  try {
    const settings = await SchoolSettings.findOne({
      order: [["updatedAt", "DESC"]]
    });

    // Fetch token price from generic Setting
    let tokenPrice = "1500"; // Default
    const priceSetting = await Setting.findByPk("tokenPrice");
    if (priceSetting && priceSetting.value) {
      tokenPrice = priceSetting.value;
    }

    if (!settings) {
      return res.status(200).json({
        schoolName: "International Technical Management Institute",
        schoolLogo: null,
        registrarSignature: null,
        principalSignature: null,
        tokenPrice
      });
    }

    return res.status(200).json({
      schoolName: settings.schoolName,
      schoolLogo: settings.schoolLogo,
      registrarSignature: settings.registrarSignature,
      principalSignature: settings.principalSignature,
      tokenPrice
    });
  } catch (error) {
    return next(error);
  }
};

const saveSchoolSettings = async (req, res, next) => {
  try {
    const { schoolName } = req.body;
    let schoolLogo = null;
    let registrarSignature = null;
    let principalSignature = null;

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        schoolLogo = `/uploads/school/${req.files.logo[0].filename}`;
      }
      if (req.files.registrarSignature && req.files.registrarSignature[0]) {
        registrarSignature = `/uploads/signatures/${req.files.registrarSignature[0].filename}`;
      }
      if (req.files.principalSignature && req.files.principalSignature[0]) {
        principalSignature = `/uploads/signatures/${req.files.principalSignature[0].filename}`;
      }
    } else if (req.file) {
      // Fallback for single file upload if route wasn't updated correctly
      schoolLogo = `/uploads/school/${req.file.filename}`;
    }

    const settings = await SchoolSettings.findOne({
      order: [["updatedAt", "DESC"]]
    });

    if (settings) {
      settings.schoolName = schoolName || settings.schoolName;
      if (schoolLogo) {
        settings.schoolLogo = schoolLogo;
      }
      if (registrarSignature) {
        settings.registrarSignature = registrarSignature;
      }
      if (principalSignature) {
        settings.principalSignature = principalSignature;
      }
      await settings.save();
      return res.status(200).json(settings);
    } else {
      const newSettings = await SchoolSettings.create({
        schoolName: schoolName || "International Technical Management Institute",
        schoolLogo,
        registrarSignature,
        principalSignature
      });
      return res.status(201).json(newSettings);
    }
  } catch (error) {
    return next(error);
  }
};

const getEmailSettings = async (req, res, next) => {
  try {
    const settings = await EmailSettings.findOne({
      where: { isActive: true },
      order: [["updatedAt", "DESC"]]
    });

    if (!settings) {
      return res.status(200).json(null);
    }

    return res.status(200).json({
      id: settings.id,
      provider: settings.provider,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      isActive: settings.isActive,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    return next(error);
  }
};

const saveEmailSettings = async (req, res, next) => {
  try {
    const provider = normalizeValue(req.body.provider);
    const smtpHost = normalizeValue(req.body.smtpHost);
    const smtpPort = normalizeValue(req.body.smtpPort);
    const smtpUser = normalizeValue(req.body.smtpUser);
    const smtpPassword = normalizeValue(req.body.smtpPassword);
    const fromEmail = normalizeValue(req.body.fromEmail);
    const fromName = normalizeValue(req.body.fromName);
    const isActive = Boolean(req.body.isActive);

    if (!provider) {
      return res.status(400).json({ error: "provider is required" });
    }
    if (!["SMTP", "SENDGRID"].includes(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }
    if (!fromEmail || !isValidEmail(fromEmail)) {
      return res.status(400).json({ error: "Valid fromEmail is required" });
    }
    if (!fromName) {
      return res.status(400).json({ error: "fromName is required" });
    }
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return res.status(400).json({
        error: "smtpHost, smtpPort, smtpUser, and smtpPassword are required"
      });
    }

    try {
      await verifySmtpConnection({ smtpHost, smtpPort, smtpUser, smtpPassword });
    } catch (err) {
      return res.status(400).json({ error: "SMTP Connection failed: " + err.message });
    }

    const encryptedPassword = encryptSecret(smtpPassword);
    if (!encryptedPassword) {
      return res
        .status(500)
        .json({ error: "Email encryption is not configured" });
    }

    const created = await EmailSettings.sequelize.transaction(
      async (transaction) => {
        // If activating this setting, deactivate all others
        if (isActive) {
          await EmailSettings.update(
            { isActive: false },
            { where: {}, transaction }
          );
        }
        
        return EmailSettings.create(
          {
            provider,
            smtpHost,
            smtpPort: Number(smtpPort),
            smtpUser,
            smtpPassword: encryptedPassword,
            fromEmail,
            fromName,
            isActive
          },
          { transaction }
        );
      }
    );

    return res.status(201).json({
      id: created.id,
      provider: created.provider,
      smtpHost: created.smtpHost,
      smtpPort: created.smtpPort,
      smtpUser: created.smtpUser,
      fromEmail: created.fromEmail,
      fromName: created.fromName,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  } catch (error) {
    return next(error);
  }
};

const verifySmtpConnection = async ({
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword
}) => {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPassword },
    tls: {
      rejectUnauthorized: false
    }
  });
  await transporter.verify();
};

const getEncryptionKey = () => {
  const raw = String(process.env.EMAIL_ENCRYPTION_KEY || process.env.JWT_SECRET || "default_secret_key_for_dev").trim();
  return crypto.createHash("sha256").update(raw).digest();
};

const encryptSecret = (value) => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(String(value));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

module.exports = { getEmailSettings, saveEmailSettings, getSchoolSettings, saveSchoolSettings };
