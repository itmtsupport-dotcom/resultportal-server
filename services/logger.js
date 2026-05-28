const { SystemLog } = require("../models");

const logEvent = async ({
  eventType,
  eventCategory,
  description,
  userType = "System",
  userId = null,
  userName = null,
  ipAddress = null,
  deviceInfo = null,
  status = "Info",
  metadata = null,
}) => {
  try {
    await SystemLog.create({
      eventType,
      eventCategory,
      description,
      userType,
      userId,
      userName,
      ipAddress,
      deviceInfo,
      status,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log system event:", error);
  }
};

module.exports = {
  logEvent,
};
