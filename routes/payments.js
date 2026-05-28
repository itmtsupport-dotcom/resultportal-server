const { Router } = require("express");
const { paystackWebhook } = require("../controllers/paymentsController");

const router = Router();

router.post("/paystack/webhook", paystackWebhook);

module.exports = router;
