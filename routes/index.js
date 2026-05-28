const { Router } = require("express");
const { healthCheck } = require("../controllers/healthController");
const adminRoutes = require("./admin");
const portalRoutes = require("./portal");
const paymentRoutes = require("./payments");

const router = Router();

router.get("/health", healthCheck);
router.use("/admin", adminRoutes);
router.use("/portal", portalRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;
