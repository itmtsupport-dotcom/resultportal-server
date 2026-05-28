const { Router } = require("express");
const {
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
  deleteDepartment
} = require("../controllers/adminAcademicsController");

const router = Router();

router.get("/sessions", listSessions);
router.post("/sessions", createSession);
router.put("/sessions/:id", updateSession);
router.delete("/sessions/:id", deleteSession);

router.get("/semesters", listSemesters);
router.post("/semesters", createSemester);
router.put("/semesters/:id", updateSemester);
router.delete("/semesters/:id", deleteSemester);

router.get("/levels", listLevels);
router.post("/levels", createLevel);
router.put("/levels/:id", updateLevel);
router.delete("/levels/:id", deleteLevel);

router.get("/departments", listDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

module.exports = router;
