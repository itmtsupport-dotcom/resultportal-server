const { sequelize } = require("../config/database");
const createUser = require("./user");
const createAdmin = require("./admin");
const createDepartment = require("./department");
const createStudent = require("./student");
const createCourse = require("./course");
const createSession = require("./session");
const createSemester = require("./semester");
const createLevel = require("./level");
const createYear = require("./year");
const createExam = require("./exam");
const createClass = require("./class");
const createResult = require("./result");
const createResultItem = require("./resultItem");
const createResultEditLog = require("./resultEditLog");
const createToken = require("./token");
const createTokenUsageLog = require("./tokenUsageLog");
const createPayment = require("./payment");
const createEmailSettings = require("./emailSettings");
const createEmailLog = require("./emailLog");
const createCertificateTemplate = require("./certificateTemplate");
const createSchoolSettings = require("./schoolSettings");
const createKnowledgeBase = require("./knowledgeBase");

const User = createUser(sequelize);
const Admin = createAdmin(sequelize);
const Department = createDepartment(sequelize);
const Student = createStudent(sequelize);
const Course = createCourse(sequelize);
const Session = createSession(sequelize);
const Semester = createSemester(sequelize);
const Level = createLevel(sequelize);
const Year = createYear(sequelize);
const Exam = createExam(sequelize);
const Class = createClass(sequelize);
const Result = createResult(sequelize);
const ResultItem = createResultItem(sequelize);
const ResultEditLog = createResultEditLog(sequelize);
const Token = createToken(sequelize);
const TokenUsageLog = createTokenUsageLog(sequelize);
const Payment = createPayment(sequelize);
const EmailSettings = createEmailSettings(sequelize);
const EmailLog = createEmailLog(sequelize);
const CertificateTemplate = createCertificateTemplate(sequelize);
const SchoolSettings = createSchoolSettings(sequelize);
const KnowledgeBase = createKnowledgeBase(sequelize);
const Notification = require("./notification")(sequelize);
const SystemLog = require("./systemLog")(sequelize);
const Setting = require("./setting")(sequelize);

// Associations
Department.hasMany(Student, { foreignKey: "departmentId" });
Student.belongsTo(Department, { foreignKey: "departmentId" });

Class.hasMany(Student, { foreignKey: "classId" });
Student.belongsTo(Class, { foreignKey: "classId" });

Department.hasMany(Course, { foreignKey: "departmentId" });
Course.belongsTo(Department, { foreignKey: "departmentId" });

Class.hasMany(Course, { foreignKey: "classId" });
Course.belongsTo(Class, { foreignKey: "classId" });

Student.hasMany(Result, { foreignKey: "studentId" });
Result.belongsTo(Student, { foreignKey: "studentId" });

Department.hasMany(Result, { foreignKey: "departmentId" });
Result.belongsTo(Department, { foreignKey: "departmentId" });

Year.hasMany(Result, { foreignKey: "yearId" });
Result.belongsTo(Year, { foreignKey: "yearId" });

Exam.hasMany(Result, { foreignKey: "examId" });
Result.belongsTo(Exam, { foreignKey: "examId" });

Class.hasMany(Result, { foreignKey: "classId" });
Result.belongsTo(Class, { foreignKey: "classId" });

Result.hasMany(ResultItem, { foreignKey: "resultId" });
ResultItem.belongsTo(Result, { foreignKey: "resultId" });

Course.hasMany(ResultItem, { foreignKey: "courseId" });
ResultItem.belongsTo(Course, { foreignKey: "courseId" });

Result.hasMany(ResultEditLog, { foreignKey: "resultId" });
ResultEditLog.belongsTo(Result, { foreignKey: "resultId" });

Admin.hasMany(ResultEditLog, { foreignKey: "adminId" });
ResultEditLog.belongsTo(Admin, { foreignKey: "adminId" });

Student.hasMany(Token, { foreignKey: "studentId" });
Token.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(Payment, { foreignKey: "studentId" });
Payment.belongsTo(Student, { foreignKey: "studentId" });

Department.hasMany(Payment, { foreignKey: "departmentId" });
Payment.belongsTo(Department, { foreignKey: "departmentId" });

Class.hasMany(Payment, { foreignKey: "classId" });
Payment.belongsTo(Class, { foreignKey: "classId" });

Year.hasMany(Payment, { foreignKey: "yearId" });
Payment.belongsTo(Year, { foreignKey: "yearId" });

Token.hasMany(TokenUsageLog, { foreignKey: "tokenId" });
TokenUsageLog.belongsTo(Token, { foreignKey: "tokenId" });

Student.hasMany(TokenUsageLog, { foreignKey: "studentId" });
TokenUsageLog.belongsTo(Student, { foreignKey: "studentId" });

Result.hasMany(TokenUsageLog, { foreignKey: "resultId" });
TokenUsageLog.belongsTo(Result, { foreignKey: "resultId" });

Session.hasMany(TokenUsageLog, { foreignKey: "sessionId" });
TokenUsageLog.belongsTo(Session, { foreignKey: "sessionId" });

Semester.hasMany(TokenUsageLog, { foreignKey: "semesterId" });
TokenUsageLog.belongsTo(Semester, { foreignKey: "semesterId" });

Year.hasMany(TokenUsageLog, { foreignKey: "yearId" });
TokenUsageLog.belongsTo(Year, { foreignKey: "yearId" });

Exam.hasMany(TokenUsageLog, { foreignKey: "examId" });
TokenUsageLog.belongsTo(Exam, { foreignKey: "examId" });

Class.hasMany(TokenUsageLog, { foreignKey: "classId" });
TokenUsageLog.belongsTo(Class, { foreignKey: "classId" });

module.exports = {
  sequelize,
  User,
  Admin,
  Department,
  Student,
  Course,
  Session,
  Semester,
  Level,
  Year,
  Exam,
  Class,
  Result,
  ResultItem,
  ResultEditLog,
  Token,
  TokenUsageLog,
  Payment,
  EmailSettings,
  EmailLog,
  CertificateTemplate,
  SchoolSettings,
  Notification,
  SystemLog,
  Setting,
  KnowledgeBase
};
