const { Router } = require("express");
const multer = require("multer");
const {
  createManualResult,
  createBulkResults,
  downloadBulkResultsCsvTemplate,
  downloadBulkResultsExcelTemplate,
  updateResultItem,
  getResultDetail,
  listResultEditLogs,
  downloadResultPdf,
  listResults,
  updateResult
} = require("../controllers/adminResultsController");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", listResults);
router.put("/:id", updateResult); // Update Result Metadata
router.post("/manual", createManualResult);
router.post("/bulk-upload", upload.single("file"), createBulkResults);
router.get("/bulk-upload/template.csv", downloadBulkResultsCsvTemplate);
router.get("/bulk-upload/template.xlsx", downloadBulkResultsExcelTemplate);
router.put("/items/:id", updateResultItem);
router.get("/:id", getResultDetail);
router.get("/:id/edit-logs", listResultEditLogs);
router.get("/:id/pdf", downloadResultPdf);

module.exports = router;
