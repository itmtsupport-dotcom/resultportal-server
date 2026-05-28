const { Router } = require("express");
const {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse
} = require("../controllers/adminCoursesController");

const router = Router();

router.get("/", listCourses);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
