const { Router } = require("express");
const {
  listPayments,
  getPaymentStats,
  getPaymentDetails
} = require("../controllers/paymentsController");

const router = Router();

router.get("/", listPayments);
router.get("/stats", getPaymentStats);
router.get("/:id", getPaymentDetails);

module.exports = router;
