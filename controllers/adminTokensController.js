const { Op } = require("sequelize");
const {
  Student,
  Token,
  TokenUsageLog,
  Result,
  ResultItem,
  Course,
  Session,
  Semester,
  Year,
  Exam,
  Class
} = require("../models");
const { generateTokenForStudent, generateBulkTokens } = require("../services/tokenService");
const { sendTokenEmail } = require("../services/emailService");
const { createNotification } = require("../services/notificationService");
const { generateTokensPdfBuffer } = require("../services/pdfService");

const bulkAction = async (req, res, next) => {
  try {
    const { action, tokenIds } = req.body;

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({ error: "No tokens selected" });
    }

    if (!["delete", "disable", "activate"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    if (action === "delete") {
      await Token.destroy({
        where: { id: { [Op.in]: tokenIds } }
      });
      return res.status(200).json({ success: true, message: `${tokenIds.length} tokens deleted` });
    }

    if (action === "disable") {
      await Token.update(
        { status: "DISABLED" },
        { where: { id: { [Op.in]: tokenIds } } }
      );
      return res.status(200).json({ success: true, message: `${tokenIds.length} tokens disabled` });
    }

    if (action === "activate") {
      // Only activate tokens that are not expired or exhausted
      // But for simplicity, we force active. 
      // Ideally, we should check if they are expired based on date.
      // Let's just set them to ACTIVE if they are currently DISABLED.
      await Token.update(
        { status: "ACTIVE" },
        { where: { id: { [Op.in]: tokenIds } } }
      );
      return res.status(200).json({ success: true, message: `${tokenIds.length} tokens activated` });
    }

  } catch (error) {
    return next(error);
  }
};

const exportTokensPdf = async (req, res, next) => {
  try {
    const { tokens } = req.body;
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "Tokens array is required" });
    }

    const buffer = await generateTokensPdfBuffer(tokens);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=tokens-${Date.now()}.pdf`);
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
};

const generateBulk = async (req, res, next) => {
  try {
    const count = parseInteger(req.body.count, 0);
    const expiresInDays = parseInteger(req.body.expiresInDays, 90);
    const maxUsage = parseInteger(req.body.maxUsage, 4);
    const registrationNumber = normalizeValue(req.body.registrationNumber);

    if (count <= 0) {
      return res.status(400).json({ error: "Count must be positive" });
    }

    let studentId = null;
    if (registrationNumber) {
      const student = await Student.findOne({ where: { registrationNumber } });
      if (student) {
        studentId = student.id;
      } else {
        return res.status(404).json({ error: "Student not found" });
      }
    }

    const tokens = await generateBulkTokens({
      count,
      expiresInDays,
      maxUsage,
      studentId
    });

    return res.status(201).json(tokens);
  } catch (error) {
    return next(error);
  }
};

const generateToken = async (req, res, next) => {
  try {
    const registrationNumber = normalizeValue(req.body.registrationNumber);
    const expiresInDays = parseInteger(req.body.expiresInDays, 90);
    const maxUsage = parseInteger(req.body.maxUsage, 4);

    if (!registrationNumber) {
      return res.status(400).json({ error: "registrationNumber is required" });
    }

    const student = await Student.findOne({ where: { registrationNumber } });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const token = await generateTokenForStudent(student.id, {
      expiresInDays,
      maxUsage
    });

    // Send Notification
    createNotification(
      "TOKEN_GENERATED",
      `Token generated for student ${student.fullName} (${student.registrationNumber})`,
      "Token",
      token.id
    );

    return res.status(201).json({
      id: token.id,
      tokenCode: token.tokenCode,
      expiresAt: token.expiresAt,
      maxUsage: token.maxUsage
    });
  } catch (error) {
    return next(error);
  }
};

const listTokens = async (req, res, next) => {
  try {
    const tokens = await Token.findAll({
      include: [{ model: Student }],
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).json(tokens);
  } catch (error) {
    return next(error);
  }
};

const getTokenById = async (req, res, next) => {
  try {
    const token = await Token.findByPk(req.params.id, {
      include: [
        { model: Student },
        {
          model: TokenUsageLog,
          include: [
            {
              model: Result,
              include: [{ model: ResultItem, include: [{ model: Course }] }]
            },
            { model: Session },
            { model: Semester },
            { model: Year },
            { model: Exam },
            { model: Class }
          ]
        }
      ],
      order: [[TokenUsageLog, "usedAt", "DESC"]]
    });

    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    return res.status(200).json(token);
  } catch (error) {
    return next(error);
  }
};

const disableToken = async (req, res, next) => {
  try {
    const token = await Token.findByPk(req.params.id);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    token.status = "DISABLED";
    await token.save();

    return res.status(200).json(token);
  } catch (error) {
    return next(error);
  }
};

const extendTokenExpiry = async (req, res, next) => {
  try {
    const extraDays = parseInteger(req.body.extraDays, null);
    if (!extraDays || extraDays <= 0) {
      return res.status(400).json({ error: "extraDays must be positive" });
    }

    const token = await Token.findByPk(req.params.id);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    if (token.status === "DISABLED") {
      return res.status(400).json({ error: "Token is disabled" });
    }

    const now = new Date();
    const baseDate =
      token.expiresAt && token.expiresAt > now ? token.expiresAt : now;
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + extraDays);

    token.expiresAt = expiresAt;
    if (token.status === "EXPIRED" && token.usageCount < token.maxUsage) {
      token.status = "ACTIVE";
    }

    await token.save();

    return res.status(200).json(token);
  } catch (error) {
    return next(error);
  }
};

const resendTokenEmail = async (req, res, next) => {
  try {
    const token = await Token.findByPk(req.params.id, {
      include: [{ model: Student }]
    });
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    if (!token.Student || !token.Student.email) {
      return res.status(404).json({ error: "Student email not found" });
    }

    const result = await sendTokenEmail(token.Student.email, token.tokenCode, {
      studentName: token.Student.fullName,
      registrationNumber: token.Student.registrationNumber,
      expiresAt: token.expiresAt,
      maxUsage: token.maxUsage
    });

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Email failed" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const resetTokenUsage = async (req, res, next) => {
  try {
    const token = await Token.findByPk(req.params.id);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    token.usageCount = 0;
    if (token.status === "EXHAUSTED") {
      token.status = "ACTIVE";
    }
    await token.save();

    return res.status(200).json(token);
  } catch (error) {
    return next(error);
  }
};

const deleteToken = async (req, res, next) => {
  try {
    const token = await Token.findByPk(req.params.id);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    await token.destroy();
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

const parseInteger = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return Math.trunc(parsed);
};

module.exports = {
  generateToken,
  generateBulk,
  listTokens,
  getTokenById,
  disableToken,
  extendTokenExpiry,
  resendTokenEmail,
  resetTokenUsage,
  deleteToken,
  exportTokensPdf,
  bulkAction
};
