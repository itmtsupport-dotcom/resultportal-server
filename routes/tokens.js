const { Router } = require("express");
const {
  generateToken,
  generateBulk,
  listTokens,
  getTokenById,
  disableToken,
  extendTokenExpiry,
  resendTokenEmail,
  resetTokenUsage,
  deleteToken,
  exportTokensPdf,
  bulkAction
} = require("../controllers/adminTokensController");

const router = Router();

router.post("/generate", generateToken);
router.post("/bulk", generateBulk);
router.post("/export-pdf", exportTokensPdf);
router.post("/bulk-action", bulkAction);
router.get("/", listTokens);
router.get("/:id", getTokenById);
router.delete("/:id", deleteToken);
router.post("/:id/resend-email", resendTokenEmail);
router.patch("/:id/disable", disableToken);
router.patch("/:id/reset-usage", resetTokenUsage);
router.patch("/:id/extend-expiry", extendTokenExpiry);

module.exports = router;
