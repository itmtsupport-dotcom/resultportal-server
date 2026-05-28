const crypto = require("crypto");
const { Token, Student } = require("../models");
const { Op } = require("sequelize");

// Helper to generate a batch of unique codes
const generateUniqueCodes = async (count, transaction) => {
  const codes = new Set();
  
  // Try to generate unique codes
  while (codes.size < count) {
    const needed = count - codes.size;
    // Generate slightly more than needed to account for collisions
    for (let i = 0; i < needed + 5; i++) {
      codes.add(crypto.randomBytes(8).toString("hex").toUpperCase());
    }
    
    // Check against database for existing codes
    const codeArray = Array.from(codes);
    const existingTokens = await Token.findAll({
      where: { tokenCode: { [Op.in]: codeArray } },
      attributes: ["tokenCode"],
      transaction
    });
    
    // Remove existing codes from our set
    existingTokens.forEach(t => codes.delete(t.tokenCode));
  }
  
  return Array.from(codes).slice(0, count);
};

const generateTokenForStudent = async (studentId, options = {}, transaction = null) => {
  if (!studentId) {
    const error = new Error("Student is required");
    error.status = 400;
    throw error;
  }

  const student = await Student.findByPk(studentId, { transaction });
  if (!student) {
    const error = new Error("Student not found");
    error.status = 404;
    throw error;
  }

  const [tokenCode] = await generateUniqueCodes(1, transaction);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays || 90));

  return Token.create(
    {
      tokenCode,
      studentId: student.id,
      maxUsage: options.maxUsage || 4,
      usageCount: 0,
      expiresAt,
      status: "ACTIVE"
    },
    { transaction }
  );
};

const generateBulkTokens = async ({
  count,
  expiresInDays,
  maxUsage,
  studentId
}, transaction = null) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 90));

  const codes = await generateUniqueCodes(count, transaction);
  
  const tokens = codes.map(code => ({
    tokenCode: code,
    studentId: studentId || null,
    maxUsage: Number(maxUsage) || 4,
    usageCount: 0,
    expiresAt,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  return Token.bulkCreate(tokens, { transaction });
};

module.exports = { generateTokenForStudent, generateBulkTokens };
