const { parse } = require("csv-parse/sync");
const { sequelize, Student, Department, Class } = require("../models");

const requiredFields = [
  "fullname",
  "registrationnumber",
  "email",
  "department",
  "class"
];

const uploadStudentsFromCsv = async (buffer) => {
  const records = parse(buffer, {
    columns: (header) => header.trim().toLowerCase(),
    skip_empty_lines: true,
    trim: true
  });

  const errors = [];
  const skippedDuplicates = new Set();
  const seenRegistrationNumbers = new Set();
  const preparedRows = [];

  records.forEach((row, index) => {
    const rowNumber = index + 2;
    const missing = requiredFields.filter((field) => {
      const value = row[field];
      return !value || String(value).trim().length === 0;
    });

    if (missing.length > 0) {
      errors.push({
        row: rowNumber,
        error: `Missing required fields: ${missing.join(", ")}`
      });
      return;
    }

    const registrationNumber = String(row.registrationnumber).trim();
    if (seenRegistrationNumbers.has(registrationNumber)) {
      skippedDuplicates.add(registrationNumber);
      return;
    }

    if (!isValidEmail(row.email)) {
      errors.push({
        row: rowNumber,
        error: "Invalid email format"
      });
      return;
    }

    seenRegistrationNumbers.add(registrationNumber);

    preparedRows.push({
      fullName: String(row.fullname).trim(),
      registrationNumber,
      email: String(row.email).trim(),
      departmentName: String(row.department).trim(),
      className: String(row.class).trim()
    });
  });

  if (preparedRows.length === 0) {
    return {
      totalUploaded: 0,
      skippedDuplicates: skippedDuplicates.size,
      errors
    };
  }

  const uniqueRegistrationNumbers = preparedRows.map(
    (row) => row.registrationNumber
  );

  const [existingStudents, departments, classes] = await sequelize.transaction(
    async (transaction) => {
      const existing = await Student.findAll({
        where: { registrationNumber: uniqueRegistrationNumbers },
        transaction
      });

      // Handle Departments
      const departmentNames = [
        ...new Set(preparedRows.map((row) => row.departmentName))
      ];

      const existingDepartments = await Department.findAll({
        where: { name: departmentNames },
        transaction
      });

      const existingDeptNameSet = new Set(
        existingDepartments.map((dept) => dept.name)
      );

      const missingDepartments = departmentNames.filter(
        (name) => !existingDeptNameSet.has(name)
      );

      if (missingDepartments.length > 0) {
        await Department.bulkCreate(
          missingDepartments.map((name) => ({ name })),
          { transaction }
        );
      }

      const allDepartments = await Department.findAll({
        where: { name: departmentNames },
        transaction
      });

      // Handle Classes
      const classNames = [
        ...new Set(preparedRows.map((row) => row.className))
      ];

      const existingClasses = await Class.findAll({
        where: { name: classNames },
        transaction
      });

      const existingClassNameSet = new Set(
        existingClasses.map((cls) => cls.name)
      );

      const missingClasses = classNames.filter(
        (name) => !existingClassNameSet.has(name)
      );

      if (missingClasses.length > 0) {
        await Class.bulkCreate(
          missingClasses.map((name) => ({ name })),
          { transaction }
        );
      }

      const allClasses = await Class.findAll({
        where: { name: classNames },
        transaction
      });

      return [existing, allDepartments, allClasses];
    }
  );

  const existingNumbers = new Set(
    existingStudents.map((student) => student.registrationNumber)
  );

  const departmentMap = new Map(
    departments.map((department) => [department.name, department.id])
  );

  const classMap = new Map(
    classes.map((cls) => [cls.name, cls.id])
  );

  const studentsToCreate = preparedRows
    .filter((row) => {
      if (existingNumbers.has(row.registrationNumber)) {
        skippedDuplicates.add(row.registrationNumber);
        return false;
      }
      return true;
    })
    .map((row) => ({
      fullName: row.fullName,
      registrationNumber: row.registrationNumber,
      email: row.email,
      departmentId: departmentMap.get(row.departmentName),
      classId: classMap.get(row.className),
      password: "defaultPassword123" // Default password
    }));

  const created = await sequelize.transaction(async (transaction) => {
    return Student.bulkCreate(studentsToCreate, {
      transaction,
      returning: true,
      ignoreDuplicates: true
    });
  });

  return {
    imported: created.length,
    skipped: skippedDuplicates.size,
    errors
  };
};

const isValidEmail = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

module.exports = { uploadStudentsFromCsv };
