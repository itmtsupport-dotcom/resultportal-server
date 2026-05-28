const { Router } = require("express");
const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  activateTemplate
} = require("../controllers/certificateController");

const router = Router();

router.post("/", createTemplate);
router.get("/", getTemplates);
router.get("/:id", getTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/:id/activate", activateTemplate);

module.exports = router;
