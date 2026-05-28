const { Op } = require("sequelize");
const { Session, Semester, Level, Department, Year, Exam, Class } = require("../models");

const listEntities = (Model) => async (req, res, next) => {
  try {
    const items = await Model.findAll({ order: [["name", "ASC"]] });
    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
};

const createEntity = (Model) => async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const existing = await Model.findOne({
      where: { name: { [Op.iLike]: name } }
    });

    if (existing) {
      return res.status(409).json({ error: "Duplicate name" });
    }

    const created = await Model.create({ name });
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const updateEntity = (Model) => async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const item = await Model.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    const existing = await Model.findOne({
      where: {
        name: { [Op.iLike]: name },
        id: { [Op.ne]: item.id }
      }
    });

    if (existing) {
      return res.status(409).json({ error: "Duplicate name" });
    }

    item.name = name;
    await item.save();
    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
};

const deleteEntity = (Model) => async (req, res, next) => {
  try {
    const item = await Model.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }
    await item.destroy();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const normalizeName = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

const listSessions = listEntities(Session);
const createSession = createEntity(Session);
const updateSession = updateEntity(Session);
const deleteSession = deleteEntity(Session);

const listSemesters = listEntities(Semester);
const createSemester = createEntity(Semester);
const updateSemester = updateEntity(Semester);
const deleteSemester = deleteEntity(Semester);

const listLevels = listEntities(Level);
const createLevel = createEntity(Level);
const updateLevel = updateEntity(Level);
const deleteLevel = deleteEntity(Level);

const listDepartments = listEntities(Department);
const createDepartment = createEntity(Department);
const updateDepartment = updateEntity(Department);
const deleteDepartment = deleteEntity(Department);

const listYears = listEntities(Year);
const createYear = createEntity(Year);
const updateYear = updateEntity(Year);
const deleteYear = deleteEntity(Year);

const listExams = listEntities(Exam);
const createExam = createEntity(Exam);
const updateExam = updateEntity(Exam);
const deleteExam = deleteEntity(Exam);

const listClasses = listEntities(Class);
const createClass = createEntity(Class);
const updateClass = updateEntity(Class);
const deleteClass = deleteEntity(Class);

module.exports = {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  listSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  listLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listYears,
  createYear,
  updateYear,
  deleteYear,
  listExams,
  createExam,
  updateExam,
  deleteExam,
  listClasses,
  createClass,
  updateClass,
  deleteClass
};
