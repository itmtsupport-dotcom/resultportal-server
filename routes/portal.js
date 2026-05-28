const { Router } = require("express");
const {
  checkResult,
  downloadResultPdf,
  initializePayment
} = require("../controllers/portalResultsController");
const {
  listSessions,
  listSemesters,
  listLevels,
  listDepartments,
  listYears,
  listExams,
  listClasses
} = require("../controllers/adminAcademicsController");
const { getSchoolSettings } = require("../controllers/adminSettingsController");
const { handleChatRequest } = require("../controllers/portalChatController");

const router = Router();

router.post("/chat", handleChatRequest);
router.post("/check-result", checkResult);
router.get("/results/:resultId/download", downloadResultPdf);
router.post("/payments/initialize", initializePayment);
router.get("/sessions", listSessions);
router.get("/semesters", listSemesters);
router.get("/levels", listLevels);
router.get("/departments", listDepartments);
router.get("/years", listYears);
router.get("/exams", listExams);
router.get("/classes", listClasses);
router.get("/school-settings", getSchoolSettings);

module.exports = router;
