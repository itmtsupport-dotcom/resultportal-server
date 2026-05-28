const { Router } = require("express");
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require("../controllers/adminNotificationController");

const router = Router();

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);

module.exports = router;
