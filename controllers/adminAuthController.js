const { Op } = require("sequelize");
const { Admin } = require("../models");
const { comparePassword, hashPassword, signToken } = require("../services/authService");
const { createNotification } = require("../services/notificationService");
const { logEvent } = require("../services/logger");

const loginAdmin = async (req, res, next) => {
  try {
    const email = normalizeValue(req.body.email);
    const password = normalizeValue(req.body.password);
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    await ensureDefaultAdmin();

    const admin = await Admin.findOne({
      where: { email: { [Op.iLike]: email } }
    });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await comparePassword(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name
    });

    // Send Notification
    createNotification(
      "ADMIN_LOGIN",
      `Admin logged in: ${admin.name} (${admin.email})`,
      "Admin",
      admin.id
    );

    // Log Event
    logEvent({
      eventType: "ADMIN_LOGIN",
      eventCategory: "Authentication",
      description: `Admin ${admin.name} logged in successfully`,
      userType: "Admin",
      userId: admin.id,
      userName: admin.name,
      ipAddress: req.ip,
      status: "Success"
    });

    return res.status(200).json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    return next(error);
  }
};

const ensureDefaultAdmin = async () => {
  const existingCount = await Admin.count();
  if (existingCount > 0) {
    return;
  }

  const name =
    normalizeValue(process.env.DEFAULT_ADMIN_NAME) || "Super Admin";
  const email =
    normalizeValue(process.env.DEFAULT_ADMIN_EMAIL) || "azdigitalsacademy@gmail.com";
  const password =
    normalizeValue(process.env.DEFAULT_ADMIN_PASSWORD) || "Admin@12345";

  const hashed = await hashPassword(password);
  await Admin.create({
    name,
    email,
    password: hashed,
    role: "SUPER_ADMIN"
  });
};

const getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findByPk(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    return res.status(200).json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      emailNotificationsEnabled: admin.emailNotificationsEnabled
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { emailNotificationsEnabled } = req.body;

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (emailNotificationsEnabled !== undefined) {
      admin.emailNotificationsEnabled = emailNotificationsEnabled;
    }

    await admin.save();

    return res.status(200).json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      emailNotificationsEnabled: admin.emailNotificationsEnabled
    });
  } catch (error) {
    return next(error);
  }
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

module.exports = { loginAdmin,
  updateProfile,
  getProfile
};
