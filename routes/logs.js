const { Router } = require("express");
const { getLogs, getLogStats } = require("../controllers/adminLogsController");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/", getLogs);
router.get("/stats", getLogStats);

module.exports = router;
