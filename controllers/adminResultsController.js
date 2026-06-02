const { Op } = require("sequelize");
const { parse } = require("csv-parse/sync");
const xlsx = require("xlsx");
const { generateResultPdfBuffer } = require("../services/pdfService");
const { createNotification } = require("../services/notificationService");
const {
  sequelize,
  Result,
  ResultItem,
  ResultEditLog,
  Admin,
  Student,
  Course,
  Department,
  Year,
  Exam,
  Class
} = require("../models");

const listResults = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search, departmentId, classId, yearId, examId } = req.query;
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const where = {};
    const studentWhere = {};

    if (search) {
      const term = search.trim();
      studentWhere[Op.or] = [
        { fullName: { [Op.iLike]: `%${term}%` } },
        { registrationNumber: { [Op.iLike]: `%${term}%` } }
      ];
    }

    if (departmentId) where.departmentId = departmentId;
    if (classId) where.classId = classId;
    if (yearId) where.yearId = yearId;
    if (examId) where.examId = examId;

    const { count, rows } = await Result.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Student,
          where: Object.keys(studentWhere).length ? studentWhere : undefined,
          attributes: ["fullName", "registrationNumber"]
        },
        { model: Department, attributes: ["name"] },
        { model: Year, attributes: ["name"] },
        { model: Exam, attributes: ["name"] },
        { model: Class, attributes: ["name"] },
        { model: ResultItem, attributes: ["id"] }
      ],
      distinct: true,
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      items: rows.map(r => {
        const json = r.toJSON();
        json.coursesCount = r.ResultItems ? r.ResultItems.length : 0;
        delete json.ResultItems;
        return json;
      }),
      total: count,
      totalPages: Math.ceil(count / limit),
      page: parseInt(page, 10)
    });
  } catch (error) {
    return next(error);
  }
};

const createManualResult = async (req, res, next) => {
  try {
    console.log("createManualResult received body:", req.body);
    const {
      studentId,
      departmentId,
      yearId,
      examId,
      classId,
      courses
    } = req.body;

    const normalizedStudentId = normalizeValue(studentId);
    const normalizedDepartmentId = normalizeValue(departmentId);
    const normalizedYearId = normalizeValue(yearId);
    const normalizedExamId = normalizeValue(examId);
    const normalizedClassId = normalizeValue(classId);

    const missingFields = [];
    if (!normalizedStudentId) missingFields.push("studentId");
    if (!normalizedDepartmentId) missingFields.push("departmentId");
    if (!normalizedYearId) missingFields.push("yearId");
    if (!normalizedExamId) missingFields.push("examId");
    if (!normalizedClassId) missingFields.push("classId");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: "courses must be a non-empty array" });
    }

    const courseIds = courses.map((item) => normalizeValue(item.courseId));
    if (courseIds.some((id) => !id)) {
      return res.status(400).json({ error: "Each course must have courseId" });
    }

    const invalidScore = courses.find((item) => !isValidScore(item.score));
    if (invalidScore) {
      return res.status(400).json({ error: "Each course must have valid score" });
    }

    const [student, department, year, exam, classObj] = await Promise.all([
      Student.findByPk(normalizedStudentId),
      Department.findByPk(normalizedDepartmentId),
      Year.findByPk(normalizedYearId),
      Exam.findByPk(normalizedExamId),
      Class.findByPk(normalizedClassId)
    ]);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    if (!year) {
      return res.status(404).json({ error: "Year not found" });
    }

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Optional: Check if student belongs to department or class if strict validation is needed
    // For now, we assume admin knows what they are doing or student might take courses from other depts

    const existing = await Result.findOne({
      where: {
        studentId: student.id,
        yearId: normalizedYearId,
        examId: normalizedExamId
      }
    });

    if (existing) {
      return res.status(409).json({ error: "Result already exists for this student, year and exam" });
    }

    const uniqueCourseIds = [...new Set(courseIds)];
    const dbCourses = await Course.findAll({
      where: {
        id: { [Op.in]: uniqueCourseIds }
        // departmentId: normalizedDepartmentId // Optional: restrict courses to department
      }
    });

    if (dbCourses.length !== uniqueCourseIds.length) {
      return res
        .status(400)
        .json({ error: "One or more courses not found" });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const createdResult = await Result.create(
        {
          studentId: student.id,
          departmentId: normalizedDepartmentId,
          yearId: normalizedYearId,
          examId: normalizedExamId,
          classId: normalizedClassId,
          published: true
        },
        { transaction }
      );

      const items = courses.map((item) => ({
        resultId: createdResult.id,
        courseId: item.courseId,
        score: Number(item.score),
        grade: calculateGrade(Number(item.score))
      }));

      await ResultItem.bulkCreate(items, { transaction });

      return createdResult;
    });

    // Send Notification
    createNotification(
      "RESULT_UPLOAD",
      `Result uploaded for student ${student.fullName} (${student.registrationNumber})`,
      "Result",
      result.id
    );

    return res.status(201).json({ id: result.id });
  } catch (error) {
    return next(error);
  }
};

const normalizeValue = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

const isValidScore = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return false;
  }
  if (numberValue < 0 || numberValue > 100) {
    return false;
  }
  return true;
};

const calculateGrade = (score) => {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
};

const createBulkResults = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    
    let rows = [];
    
    // 1. Parse File
    if (fileType === 'csv') {
      const content = fileBuffer.toString('utf-8');
      rows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ error: "Unsupported file format. Use CSV or Excel." });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "File is empty" });
    }

    // 2. Identify Headers
    // Standard headers we expect: Name, Reg Number, Department, Class, Exam, Year
    // All other headers are treated as Course Codes (or Course Names)
    const firstRow = rows[0];
    const headers = Object.keys(firstRow);
    
    const metaHeaders = ["name", "reg number", "regnumber", "registration number", "department", "class", "exam", "year"];
    
    const courseHeaders = headers.filter(h => !metaHeaders.includes(h.toLowerCase().trim()));
    
    if (courseHeaders.length === 0) {
      return res.status(400).json({ error: "No course columns found in the file." });
    }

    // 3. Process Rows
    const errors = [];
    let successfulRecords = 0;
    let skippedRows = 0;

    // Cache for entities to reduce DB calls
    const cache = {
      students: {},
      departments: {},
      classes: {},
      years: {},
      exams: {},
      courses: {}
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Assuming header is row 1

      try {
        // Normalize keys
        const normRow = {};
        Object.keys(row).forEach(k => {
          normRow[k.toLowerCase().trim()] = row[k];
        });

        const regNo = normRow["reg number"] || normRow["regnumber"] || normRow["registration number"];
        const deptName = normRow["department"];
        const className = normRow["class"];
        const yearName = normRow["year"];
        const examName = normRow["exam"];

        if (!regNo || !deptName || !className || !yearName || !examName) {
          errors.push({ row: rowNum, error: "Missing required fields (Reg Number, Department, Class, Year, Exam)" });
          skippedRows++;
          continue;
        }

        // Resolve Entities
        // Student
        let student = cache.students[regNo];
        if (!student) {
          student = await Student.findOne({ where: { registrationNumber: regNo } });
          if (!student) {
             // Create Student if missing
             // We need full name, but header only has "Name"
             // Assuming "Name" header exists in normRow
             const studentName = normRow["name"] || "Unknown Student";
             
             // We need department and class for student creation
             // We resolve them first below, but we need them here.
             // So let's reorder: Resolve Dept/Class first, then Student.
          } else {
             cache.students[regNo] = student;
          }
        }
        
        // Department
        let department = cache.departments[deptName];
        if (!department) {
          department = await Department.findOne({ where: { name: { [Op.iLike]: deptName } } });
          if (!department) {
             // Create Department
             department = await Department.create({ name: deptName, code: deptName.substring(0, 3).toUpperCase() });
          }
          cache.departments[deptName] = department;
        }

        // Class
        let classObj = cache.classes[className];
        if (!classObj) {
          classObj = await Class.findOne({ where: { name: { [Op.iLike]: className } } });
          if (!classObj) {
             // Create Class
             classObj = await Class.create({ name: className, level: "Unknown" }); // Level is required? Model check needed
          }
          cache.classes[className] = classObj;
        }

        // Now Resolve Student with created/found dept & class
        if (!student) {
           const studentName = normRow["name"] || "Unknown Student";
           // Generate email if missing (optional)
           const email = `${regNo.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@student.local`;
           
           student = await Student.create({
             fullName: studentName,
             registrationNumber: regNo,
             email: email,
             departmentId: department.id,
             classId: classObj.id,
             password: "password123" // Default password
           });
           cache.students[regNo] = student;
        }

        // Year
        let year = cache.years[yearName];
        if (!year) {
          year = await Year.findOne({ where: { name: { [Op.iLike]: yearName } } });
          if (!year) {
             year = await Year.create({ name: yearName, isCurrent: false });
          }
          cache.years[yearName] = year;
        }

        // Exam
        let exam = cache.exams[examName];
        if (!exam) {
          exam = await Exam.findOne({ where: { name: { [Op.iLike]: examName } } });
          if (!exam) {
             exam = await Exam.create({ name: examName, code: examName.substring(0, 3).toUpperCase(), yearId: year.id });
          }
          cache.exams[examName] = exam;
        }

        // Check for existing result
        let result = await Result.findOne({
          where: {
            studentId: student.id,
            yearId: year.id,
            examId: exam.id
          }
        });

        if (result) {
          // If result exists, we will update items in it. 
          // (No op here, just reuse 'result')
        } else {
          result = await Result.create({
            studentId: student.id,
            departmentId: department.id,
            classId: classObj.id,
            yearId: year.id,
            examId: exam.id,
            published: true
          });
        }

        // Process Courses
        for (const header of courseHeaders) {
          const rawValue = row[header];
          if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") continue;

          const score = Number(rawValue);
          if (!isValidScore(score)) {
            errors.push({ row: rowNum, error: `Invalid score for ${header}: ${rawValue}` });
            continue;
          }

          // Resolve Course
          // We assume the header is the Course Code or Name
          let course = cache.courses[header];
          if (!course) {
             // Try strict code match
             course = await Course.findOne({ 
               where: { 
                 [Op.or]: [
                   { courseCode: { [Op.iLike]: header.trim() } },
                   { name: { [Op.iLike]: header.trim() } }
                 ]
               } 
             });
             
             if (!course) {
                // Auto-create Course
                // We need class and department. We have classObj and department from above.
                // We assume header is the course code/name.
                course = await Course.create({
                  name: header.trim(),
                  courseCode: header.trim().substring(0, 10).toUpperCase(), // simple code gen
                  classId: classObj.id,
                  departmentId: department.id,
                  units: 3 // Default units
                });
             }
             cache.courses[header] = course;
          }

          if (!course) {
             // This should be unreachable now unless creation fails
             errors.push({ row: rowNum, error: `Course not found: ${header}` });
             continue;
          }

          // Check if ResultItem exists
          const existingItem = await ResultItem.findOne({
            where: {
              resultId: result.id,
              courseId: course.id
            }
          });

          if (existingItem) {
            existingItem.score = score;
            existingItem.grade = calculateGrade(score);
            await existingItem.save();
          } else {
            await ResultItem.create({
              resultId: result.id,
              courseId: course.id,
              score,
              grade: calculateGrade(score)
            });
          }
        }

        successfulRecords++;

      } catch (rowError) {
        console.error(`Error processing row ${rowNum}:`, rowError);
        errors.push({ row: rowNum, error: "Internal processing error" });
        skippedRows++;
      }
    }

    return res.status(200).json({
      success: true,
      successfulRecords,
      skippedRows,
      errors
    });

  } catch (error) {
    return next(error);
  }
};

const requiredColumns = [
  "registrationnumber",
  "coursecode",
  "score",
  "year",
  "exam",
  "class"
];

const parseUploadFile = (file) => {
  // ... implementation ...
  // Placeholder
  return { rows: [], headerError: null };
};

const normalizeRow = (row) => {
  return Object.entries(row).reduce((acc, [key, value]) => {
    const normalizedKey = String(key).trim().toLowerCase();
    acc[normalizedKey] = value;
    return acc;
  }, {});
};

const downloadBulkResultsCsvTemplate = (req, res) => {
  const header =
    "Name,Reg Number,Department,Class,Exam,Year,Course 1,Course 2,Course 3,Course 4,Course 5,Course 6,Course 7,Course 8";
  const sampleRows = [
    "Everest Tochi,ITMT/334/5567,SHIPP,SS2,Midterm,2026/2027,54,65,78,80,67,72,60,88",
    "John Adewale,ITMT/334/5568,SHIPP,SS2,Midterm,2026/2027,70,82,69,74,90,77,68,85",
    "Mary Johnson,ITMT/334/5569,SHIPP,SS2,Midterm,2026/2027,65,59,72,88,79,61,70,66"
  ];
  const csv = `${header}\n${sampleRows.join("\n")}\n`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=bulk-results-template.csv"
  );
  return res.status(200).send(csv);
};

const downloadBulkResultsExcelTemplate = (req, res) => {
  const headers = [
    "Name", "Reg Number", "Department", "Class", "Exam", "Year",
    "Course 1", "Course 2", "Course 3", "Course 4", "Course 5", "Course 6", "Course 7", "Course 8"
  ];
  
  const data = [
    headers,
    ["Everest Tochi", "ITMT/334/5567", "SHIPP", "SS2", "Midterm", "2026/2027", 54, 65, 78, 80, 67, 72, 60, 88],
    ["John Adewale", "ITMT/334/5568", "SHIPP", "SS2", "Midterm", "2026/2027", 70, 82, 69, 74, 90, 77, 68, 85],
    ["Mary Johnson", "ITMT/334/5569", "SHIPP", "SS2", "Midterm", "2026/2027", 65, 59, 72, 88, 79, 61, 70, 66]
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(data);
  
  // Set column widths for better readability
  ws["!cols"] = [
    { wch: 20 }, // Name
    { wch: 15 }, // Reg Number
    { wch: 10 }, // Department
    { wch: 8 },  // Class
    { wch: 10 }, // Exam
    { wch: 10 }, // Year
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 } // Courses
  ];

  xlsx.utils.book_append_sheet(wb, ws, "Student Results");

  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=bulk-results-template.xlsx"
  );
  return res.status(200).send(buffer);
};

const updateResultItem = async (req, res, next) => {
  try {
    const adminId = req.user && req.user.id;
    if (!adminId) {
      return res.status(403).json({ error: "Admin not found in token" });
    }

    const score = Number(req.body.score);
    if (!isValidScore(score)) {
      return res.status(400).json({ error: "Valid score is required" });
    }

    const resultItem = await ResultItem.findByPk(req.params.id);
    if (!resultItem) {
      return res.status(404).json({ error: "Result item not found" });
    }

    const newGrade = calculateGrade(score);
    const edits = [];

    if (Number(resultItem.score) !== score) {
      edits.push({
        resultId: resultItem.resultId,
        adminId,
        fieldChanged: "score",
        oldValue: String(resultItem.score),
        newValue: String(score),
        editedAt: new Date()
      });
    }

    if (resultItem.grade !== newGrade) {
      edits.push({
        resultId: resultItem.resultId,
        adminId,
        fieldChanged: "grade",
        oldValue: String(resultItem.grade),
        newValue: String(newGrade),
        editedAt: new Date()
      });
    }

    await sequelize.transaction(async (transaction) => {
      resultItem.score = score;
      resultItem.grade = newGrade;
      await resultItem.save({ transaction });

      if (edits.length > 0) {
        await ResultEditLog.bulkCreate(edits, { transaction });
      }
    });

    return res.status(200).json({
      id: resultItem.id,
      score: resultItem.score,
      grade: resultItem.grade
    });
  } catch (error) {
    return next(error);
  }
};

const getResultDetail = async (req, res, next) => {
  try {
    const result = await Result.findByPk(req.params.id, {
      include: [
        { model: Student },
        { model: Department },
        { model: Year },
        { model: Exam },
        { model: Class },
        { model: ResultItem, include: [{ model: Course }] }
      ]
    });

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    return res.status(200).json({
      id: result.id,
      published: result.published,
      verificationCode: result.verificationCode,
      issuedAt: result.issuedAt,
      createdAt: result.createdAt,
      student: result.Student
        ? {
            id: result.Student.id,
            fullName: result.Student.fullName,
            registrationNumber: result.Student.registrationNumber,
            email: result.Student.email
          }
        : null,
      department: result.Department
        ? { id: result.Department.id, name: result.Department.name }
        : null,
      year: result.Year
        ? { id: result.Year.id, name: result.Year.name }
        : null,
      exam: result.Exam
        ? { id: result.Exam.id, name: result.Exam.name }
        : null,
      class: result.Class
        ? { id: result.Class.id, name: result.Class.name }
        : null,
      items: (result.ResultItems || []).map((item) => ({
        id: item.id,
        courseId: item.courseId,
        courseCode: item.Course ? item.Course.courseCode : null,
        courseTitle: item.Course ? item.Course.name : null, // Course now uses 'name' not 'courseTitle'
        score: item.score,
        grade: item.grade
      }))
    });
  } catch (error) {
    return next(error);
  }
};

const listResultEditLogs = async (req, res, next) => {
  try {
    const logs = await ResultEditLog.findAll({
      where: { resultId: req.params.id },
      include: [{ model: Admin }],
      order: [["editedAt", "DESC"]]
    });

    return res.status(200).json(
      logs.map((log) => ({
        id: log.id,
        fieldChanged: log.fieldChanged,
        oldValue: log.oldValue,
        newValue: log.newValue,
        editedAt: log.editedAt,
        adminName: log.Admin ? log.Admin.name : null,
        adminEmail: log.Admin ? log.Admin.email : null
      }))
    );
  } catch (error) {
    return next(error);
  }
};

const downloadResultPdf = async (req, res, next) => {
  try {
    const buffer = await generateResultPdfBuffer(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=result-${req.params.id}.pdf`
    );
    // Puppeteer might return Uint8Array, explicitly convert to Buffer to ensure binary response
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
};

const verifyResult = async (req, res, next) => {
  try {
    const verificationCode = normalizeValue(req.params.verificationCode);
    if (!verificationCode) {
      return res.status(400).json({ error: "verificationCode is required" });
    }

    const result = await Result.findOne({
      where: { verificationCode },
      include: [{ model: Student }, { model: Year }, { model: Exam }, { model: Class }]
    });

    if (!result) {
      return res.status(200).json({ status: "INVALID" });
    }

    return res.status(200).json({
      status: "VALID",
      studentName: result.Student ? result.Student.fullName : null,
      registrationNumber: result.Student
        ? result.Student.registrationNumber
        : null,
      year: result.Year ? result.Year.name : null,
      exam: result.Exam ? result.Exam.name : null,
      class: result.Class ? result.Class.name : null,
      issuedAt: result.issuedAt
    });
  } catch (error) {
    return next(error);
  }
};

const updateResult = async (req, res, next) => {
  try {
    const { departmentId, yearId, examId, classId } = req.body;
    
    // Find the result first
    const result = await Result.findByPk(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    // Check for duplicate result (student + year + exam) if those fields are changing
    if (yearId || examId) {
      const newYearId = yearId || result.yearId;
      const newExamId = examId || result.examId;
      
      const existing = await Result.findOne({
        where: {
          studentId: result.studentId,
          yearId: newYearId,
          examId: newExamId,
          id: { [Op.ne]: result.id } // Exclude current result
        }
      });

      if (existing) {
        return res.status(409).json({ error: "Another result already exists for this student, year and exam" });
      }
    }

    // Validate foreign keys if provided
    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (!dept) return res.status(404).json({ error: "Department not found" });
    }
    if (classId) {
      const cls = await Class.findByPk(classId);
      if (!cls) return res.status(404).json({ error: "Class not found" });
    }
    if (yearId) {
      const yr = await Year.findByPk(yearId);
      if (!yr) return res.status(404).json({ error: "Year not found" });
    }
    if (examId) {
      const ex = await Exam.findByPk(examId);
      if (!ex) return res.status(404).json({ error: "Exam not found" });
    }

    // Update fields
    if (departmentId) result.departmentId = departmentId;
    if (classId) result.classId = classId;
    if (yearId) result.yearId = yearId;
    if (examId) result.examId = examId;

    await result.save();

    // Fetch fresh data with associations to return
    const updatedResult = await Result.findByPk(result.id, {
      include: [
        { model: Student, attributes: ["fullName", "registrationNumber"] },
        { model: Department, attributes: ["name"] },
        { model: Year, attributes: ["name"] },
        { model: Exam, attributes: ["name"] },
        { model: Class, attributes: ["name"] },
        { model: ResultItem, attributes: ["id"] }
      ]
    });

    const json = updatedResult.toJSON();
    json.coursesCount = updatedResult.ResultItems ? updatedResult.ResultItems.length : 0;
    delete json.ResultItems;

    return res.status(200).json(json);
  } catch (error) {
    return next(error);
  }
};

const deleteResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that result exists
    const result = await Result.findByPk(id);
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    // Delete within a transaction to ensure data consistency
    await sequelize.transaction(async (transaction) => {
      // Delete all ResultEditLogs associated with this result
      await ResultEditLog.destroy({
        where: { resultId: id },
        transaction
      });

      // Delete all ResultItems associated with this result
      await ResultItem.destroy({
        where: { resultId: id },
        transaction
      });

      // Delete the result itself
      await Result.destroy({
        where: { id },
        transaction
      });
    });

    // Log the deletion action
    createNotification(
      "RESULT_DELETED",
      `Result deleted for student ${result.Student ? result.Student.fullName : "Unknown"} (ID: ${id})`,
      "Result",
      id
    );

    return res.status(200).json({ message: "Result deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

const deleteResults = async (req, res, next) => {
  try {
    const { ids } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }

    // Verify all results exist
    const results = await Result.findAll({
      where: { id: ids },
      include: [{ model: Student }]
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "No results found with provided IDs" });
    }

    if (results.length !== ids.length) {
      return res.status(400).json({
        error: `Some results not found. Found ${results.length} out of ${ids.length}`
      });
    }

    // Delete within a transaction to ensure data consistency
    await sequelize.transaction(async (transaction) => {
      // Delete all ResultEditLogs associated with these results
      await ResultEditLog.destroy({
        where: { resultId: ids },
        transaction
      });

      // Delete all ResultItems associated with these results
      await ResultItem.destroy({
        where: { resultId: ids },
        transaction
      });

      // Delete the results themselves
      await Result.destroy({
        where: { id: ids },
        transaction
      });
    });

    // Log the bulk deletion action
    results.forEach(result => {
      createNotification(
        "RESULT_DELETED",
        `Result deleted for student ${result.Student ? result.Student.fullName : "Unknown"} (ID: ${result.id})`,
        "Result",
        result.id
      );
    });

    return res.status(200).json({
      message: `${results.length} result(s) deleted successfully`,
      deletedCount: results.length
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createManualResult,
  createBulkResults,
  downloadBulkResultsCsvTemplate,
  downloadBulkResultsExcelTemplate,
  updateResultItem,
  getResultDetail,
  listResultEditLogs,
  downloadResultPdf,
  listResults,
  verifyResult,
  updateResult,
  deleteResult,
  deleteResults
};
