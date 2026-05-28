const { Notification } = require("../models");

const listNotifications = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      items: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      page: parseInt(page, 10)
    });
  } catch (error) {
    return next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { isRead: false }
    });
    return res.status(200).json({ count });
  } catch (error) {
    return next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    return next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { isRead: false } }
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
