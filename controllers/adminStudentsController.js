const { Op } = require("sequelize");
const {
  Student,
  Department,
  Class,
  Result,
  Token,
  TokenUsageLog,
  Session,
  Semester
} = require("../models");
const { uploadStudentsFromCsv } = require("../services/studentUploadService");
const { createNotification } = require("../services/notificationService");

const createStudent = async (req, res, next) => {
  try {
    const { fullName, registrationNumber, email, departmentId, classId } = req.body;
    
    if (!fullName || !registrationNumber || !departmentId || !classId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedReg = normalizeValue(registrationNumber);
    const normalizedDept = normalizeValue(departmentId);
    const normalizedClass = normalizeValue(classId);
    
    const existing = await Student.findOne({ where: { registrationNumber: normalizedReg } });
    if (existing) {
      return res.status(409).json({ error: "Registration number already exists" });
    }

    const classObj = await Class.findByPk(normalizedClass);
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    const student = await Student.create({
      fullName,
      registrationNumber: normalizedReg,
      email: normalizeValue(email),
      departmentId: normalizedDept,
      classId: normalizedClass,
      password: "defaultPassword123" // In a real app, generate or let user set this
    });

    // Send Notification
    createNotification(
      "STUDENT_CREATED",
      `Student created: ${student.fullName} (${student.registrationNumber})`,
      "Student",
      student.id
    );

    return res.status(201).json(student);
  } catch (error) {
    return next(error);
  }
};

const uploadStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const result = await uploadStudentsFromCsv(req.file.buffer);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const downloadStudentsTemplate = (req, res) => {
  const header = "fullName,registrationNumber,email,department,class";
  const sample =
    "Jane Doe,ITMT/CSC/0001,jane.doe@example.com,Computer Science,SS1";
  const csv = `${header}\n${sample}\n`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=students-upload-template.csv"
  );
  return res.status(200).send(csv);
};

const listStudents = async (req, res, next) => {
  try {
    const search = normalizeValue(req.query.search);
    const departmentId = normalizeValue(req.query.departmentId);
    const classId = normalizeValue(req.query.classId);
    const page = parseInteger(req.query.page, 1);
    const pageSize = parseInteger(req.query.pageSize, 10);
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { registrationNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (classId) {
      where.classId = classId;
    }

    const { count, rows } = await Student.findAndCountAll({
      where,
      include: [{ model: Department }, { model: Class }],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return res.status(200).json({
      items: rows.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        registrationNumber: student.registrationNumber,
        email: student.email,
        class: student.Class ? student.Class.name : null,
        department: student.Department ? student.Department.name : null,
        isActive: student.isActive,
        createdAt: student.createdAt
      })),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    });
  } catch (error) {
    return next(error);
  }
};

const getStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [{ model: Department }, { model: Class }]
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.status(200).json({
      id: student.id,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      email: student.email,
      class: student.Class ? student.Class.name : null,
      department: student.Department ? student.Department.name : null,
      createdAt: student.createdAt
    });
  } catch (error) {
    return next(error);
  }
};

const listStudentResults = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const results = await Result.findAll({
      where: { studentId },
      include: [{ model: Session }, { model: Semester }, { model: Class }],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json(
      results.map((result) => ({
        id: result.id,
        session: result.Session ? result.Session.name : null,
        semester: result.Semester ? result.Semester.name : null,
        class: result.Class ? result.Class.name : null,
        published: result.published,
        createdAt: result.createdAt
      }))
    );
  } catch (error) {
    return next(error);
  }
};

const listStudentTokens = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const tokens = await Token.findAll({
      where: { studentId },
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json(
      tokens.map((token) => ({
        id: token.id,
        tokenCode: token.tokenCode,
        status: token.status,
        usageCount: token.usageCount,
        maxUsage: token.maxUsage,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt
      }))
    );
  } catch (error) {
    return next(error);
  }
};

const listStudentTokenUsageLogs = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const logs = await TokenUsageLog.findAll({
      where: { studentId },
      include: [{ model: Token }, { model: Result }, { model: Session }, { model: Semester }, { model: Class }],
      order: [["usedAt", "DESC"]]
    });

    return res.status(200).json(
      logs.map((log) => ({
        id: log.id,
        tokenCode: log.Token ? log.Token.tokenCode : null,
        resultId: log.resultId,
        session: log.Session ? log.Session.name : null,
        semester: log.Semester ? log.Semester.name : null,
        class: log.Class ? log.Class.name : null,
        success: log.success,
        usedAt: log.usedAt
      }))
    );
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
    return fallback;
  }
  return Math.max(1, Math.trunc(parsed));
};

module.exports = {
  createStudent,
  uploadStudents,
  downloadStudentsTemplate,
  listStudents,
  getStudentProfile,
  listStudentResults,
  listStudentTokens,
  listStudentTokenUsageLogs
};
