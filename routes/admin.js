const { Router } = require("express");
const multer = require("multer");
const {
  uploadStudents,
  downloadStudentsTemplate,
  listStudents,
  getStudentProfile,
  listStudentResults,
  listStudentTokens,
  listStudentTokenUsageLogs
} = require("../controllers/adminStudentsController");
const { loginAdmin, updateProfile, getProfile } = require("../controllers/adminAuthController");
const { verifyResult } = require("../controllers/adminResultsController");
const { 
  listKnowledgeBase, 
  createKnowledgeBaseEntry, 
  updateKnowledgeBaseEntry, 
  deleteKnowledgeBaseEntry 
} = require("../controllers/portalChatController");
const { Student, Result, Token, TokenUsageLog } = require("../models");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

const academicsRoutes = require("./academics");
const coursesRoutes = require("./courses");
const resultsRoutes = require("./results");
const tokensRoutes = require("./tokens");
const settingsRoutes = require("./settings");
const notificationsRoutes = require("./notifications");
const paymentRoutes = require("./adminPayments");
const certificateRoutes = require("./certificates");
const logsRoutes = require("./logs");

const {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  listLevels,
  createLevel,
  updateLevel,
  deleteLevel,
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
} = require("../controllers/adminAcademicsController");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Knowledge Base Management (Moved to top for priority)
router.get("/kb", requireAuth, requireAdmin, (req, res, next) => {
  console.log("GET /api/admin/kb called");
  listKnowledgeBase(req, res, next);
});
router.post("/kb", requireAuth, requireAdmin, createKnowledgeBaseEntry);
router.put("/kb/:id", requireAuth, requireAdmin, updateKnowledgeBaseEntry);
router.delete("/kb/:id", requireAuth, requireAdmin, deleteKnowledgeBaseEntry);

router.post("/auth/login", loginAdmin);
router.put("/auth/profile", requireAuth, requireAdmin, updateProfile);
router.get("/auth/profile", requireAuth, requireAdmin, getProfile);

// Sessions (Deprecated, but keeping for compatibility if needed or migrate to Years)
router.get("/sessions", requireAuth, requireAdmin, listSessions);
router.post("/sessions", requireAuth, requireAdmin, createSession);
router.put("/sessions/:id", requireAuth, requireAdmin, updateSession);
router.delete("/sessions/:id", requireAuth, requireAdmin, deleteSession);

// Levels (Deprecated, but keeping for compatibility if needed or migrate to Classes)
router.get("/levels", requireAuth, requireAdmin, listLevels);
router.post("/levels", requireAuth, requireAdmin, createLevel);
router.put("/levels/:id", requireAuth, requireAdmin, updateLevel);
router.delete("/levels/:id", requireAuth, requireAdmin, deleteLevel);

// Years
router.get("/years", requireAuth, requireAdmin, listYears);
router.post("/years", requireAuth, requireAdmin, createYear);
router.put("/years/:id", requireAuth, requireAdmin, updateYear);
router.delete("/years/:id", requireAuth, requireAdmin, deleteYear);

// Exams
router.get("/exams", requireAuth, requireAdmin, listExams);
router.post("/exams", requireAuth, requireAdmin, createExam);
router.put("/exams/:id", requireAuth, requireAdmin, updateExam);
router.delete("/exams/:id", requireAuth, requireAdmin, deleteExam);

// Classes
router.get("/classes", requireAuth, requireAdmin, listClasses);
router.post("/classes", requireAuth, requireAdmin, createClass);
router.put("/classes/:id", requireAuth, requireAdmin, updateClass);
router.delete("/classes/:id", requireAuth, requireAdmin, deleteClass);

router.post("/students", requireAuth, requireAdmin, require("../controllers/adminStudentsController").createStudent);
router.post("/students/upload", requireAuth, requireAdmin, upload.single("file"), uploadStudents);
router.get("/students/template", requireAuth, requireAdmin, downloadStudentsTemplate);
router.get("/students", requireAuth, requireAdmin, listStudents);
router.get("/students/:id", requireAuth, requireAdmin, getStudentProfile);
router.get("/students/:id/results", requireAuth, requireAdmin, listStudentResults);
router.get("/students/:id/tokens", requireAuth, requireAdmin, listStudentTokens);
router.get(
  "/students/:id/token-usage",
  requireAuth,
  requireAdmin,
  listStudentTokenUsageLogs
);
router.get("/verify/:verificationCode", requireAuth, requireAdmin, verifyResult);
router.get("/analytics/summary", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [totalStudents, totalResults, totalTokens, tokensUsed] =
      await Promise.all([
        Student.count(),
        Result.count(),
        Token.count(),
        TokenUsageLog.count({ where: { success: true } })
      ]);

    return res.status(200).json({
      totalStudents,
      totalResults,
      totalTokens,
      tokensUsed,
      revenueSummary: null
    });
  } catch (error) {
    return next(error);
  }
});
router.use("/academics", requireAuth, requireAdmin, academicsRoutes);
router.use("/courses", requireAuth, requireAdmin, coursesRoutes);
router.use("/results", requireAuth, requireAdmin, resultsRoutes);
router.use("/tokens", requireAuth, requireAdmin, tokensRoutes);
router.use("/settings", requireAuth, requireAdmin, settingsRoutes);
router.use("/notifications", requireAuth, requireAdmin, notificationsRoutes);
router.use("/payments", requireAuth, requireAdmin, paymentRoutes);
router.use("/certificates", requireAuth, requireAdmin, certificateRoutes);
router.use("/logs", requireAuth, requireAdmin, logsRoutes);

module.exports = router;
