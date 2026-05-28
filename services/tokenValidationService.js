const { Token } = require("../models");

const validateTokenCode = async (tokenCode) => {
  const normalized = normalizeValue(tokenCode);
  if (!normalized) {
    const error = new Error("Token code is required");
    error.status = 400;
    throw error;
  }

  const token = await Token.findOne({ where: { tokenCode: normalized } });
  if (!token) {
    const error = new Error("Token not found");
    error.status = 404;
    throw error;
  }

  if (token.status !== "ACTIVE") {
    const error = new Error(`Token status is ${token.status}`);
    error.status = 400;
    throw error;
  }

  const now = new Date();
  if (token.expiresAt && token.expiresAt <= now) {
    token.status = "EXPIRED";
    await token.save();
    const error = new Error("Token expired");
    error.status = 400;
    throw error;
  }

  if (Number(token.usageCount) >= Number(token.maxUsage)) {
    token.status = "EXHAUSTED";
    await token.save();
    const error = new Error("Token usage exhausted");
    error.status = 400;
    throw error;
  }

  return token;
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

module.exports = { validateTokenCode };
