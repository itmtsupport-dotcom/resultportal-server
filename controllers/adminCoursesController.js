const { Op } = require("sequelize");
const { Course, Department, Class } = require("../models");

const listCourses = async (req, res, next) => {
  try {
    const { departmentId, classId } = req.query;
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (classId) where.classId = classId;

    const courses = await Course.findAll({
      where,
      include: [
        { model: Department, attributes: ["name"] },
        { model: Class, attributes: ["name"] }
      ],
      order: [["name", "ASC"]]
    });

    return res.status(200).json(courses);
  } catch (error) {
    return next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const { name, classId, departmentId, units } = req.body;
    const normalizedName = normalizeValue(name);
    const normalizedClassId = normalizeValue(classId);
    const normalizedDepartmentId = normalizeValue(departmentId);
    const normalizedUnits = parseInt(units, 10);

    if (!normalizedName || !normalizedClassId || !normalizedDepartmentId) {
      return res.status(400).json({
        error: "name, classId, and departmentId are required"
      });
    }

    const [department, classObj] = await Promise.all([
      Department.findByPk(normalizedDepartmentId),
      Class.findByPk(normalizedClassId)
    ]);

    if (!department) return res.status(404).json({ error: "Department not found" });
    if (!classObj) return res.status(404).json({ error: "Class not found" });

    const existing = await Course.findOne({
      where: {
        departmentId: normalizedDepartmentId,
        classId: normalizedClassId,
        name: { [Op.iLike]: normalizedName }
      }
    });

    if (existing) {
      return res.status(409).json({ error: "Course already exists in this class and department" });
    }

    const created = await Course.create({
      name: normalizedName,
      classId: normalizedClassId,
      departmentId: normalizedDepartmentId,
      units: isNaN(normalizedUnits) ? 0 : normalizedUnits
    });

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { name, classId, departmentId, units } = req.body;
    const normalizedName = normalizeValue(name);
    const normalizedClassId = normalizeValue(classId);
    const normalizedDepartmentId = normalizeValue(departmentId);
    const normalizedUnits = parseInt(units, 10);

    if (!normalizedName || !normalizedClassId || !normalizedDepartmentId) {
      return res.status(400).json({
        error: "name, classId, and departmentId are required"
      });
    }

    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const [department, classObj] = await Promise.all([
      Department.findByPk(normalizedDepartmentId),
      Class.findByPk(normalizedClassId)
    ]);

    if (!department) return res.status(404).json({ error: "Department not found" });
    if (!classObj) return res.status(404).json({ error: "Class not found" });

    const existing = await Course.findOne({
      where: {
        departmentId: normalizedDepartmentId,
        classId: normalizedClassId,
        name: { [Op.iLike]: normalizedName },
        id: { [Op.ne]: course.id }
      }
    });

    if (existing) {
      return res.status(409).json({ error: "Course already exists in this class and department" });
    }

    course.name = normalizedName;
    course.classId = normalizedClassId;
    course.departmentId = normalizedDepartmentId;
    course.units = isNaN(normalizedUnits) ? 0 : normalizedUnits;

    await course.save();
    return res.status(200).json(course);
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    await course.destroy();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse
};
