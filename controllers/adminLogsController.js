const { SystemLog } = require("../models");
const { Op } = require("sequelize");

const getLogs = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { userName: { [Op.like]: `%${search}%` } },
        { eventType: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) where.eventCategory = category;
    if (status) where.status = status;
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    }

    const { count, rows } = await SystemLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]]
    });

    res.json({
      logs: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

const getLogStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalLogsToday = await SystemLog.count({
      where: { createdAt: { [Op.gte]: today } }
    });

    const adminActions = await SystemLog.count({
      where: { 
        userType: "Admin",
        createdAt: { [Op.gte]: today }
      }
    });

    const studentActivities = await SystemLog.count({
      where: { 
        userType: "Student",
        createdAt: { [Op.gte]: today }
      }
    });

    const systemErrors = await SystemLog.count({
      where: { 
        status: "Failed",
        createdAt: { [Op.gte]: today }
      }
    });

    res.json({
      totalLogsToday,
      adminActions,
      studentActivities,
      systemErrors
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogs,
  getLogStats
};
