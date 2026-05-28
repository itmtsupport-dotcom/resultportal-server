const { Notification, Admin, Student, Result, Token, Department, Year, Exam } = require("../models");
const { sendAdminNotificationEmail } = require("./emailService");

let io = null;

const setIo = (socketIo) => {
  io = socketIo;
};

const createNotification = async (type, message, entityType = null, entityId = null) => {
  try {
    const notification = await Notification.create({
      type,
      message,
      entityType,
      entityId,
      isRead: false
    });

    if (io) {
      io.emit("newNotification", notification);
    }

    // Trigger Email Alerts asynchronously
    sendEmailAlerts(type, message, entityType, entityId).catch(err => 
      console.error("Failed to send email alerts:", err)
    );

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    // Don't throw, just log, so we don't break the main flow
    return null;
  }
};

const sendEmailAlerts = async (type, message, entityType, entityId) => {
  // 1. Fetch admins with enabled notifications
  const admins = await Admin.findAll({
    where: { emailNotificationsEnabled: true }
  });

  if (admins.length === 0) return;

  // 2. Prepare Details based on Entity
  let details = {};
  
  if (entityType === "Result" && entityId) {
    const result = await Result.findByPk(entityId, {
      include: [
        { model: Student },
        { model: Department },
        { model: Year },
        { model: Exam }
      ]
    });
    if (result) {
      details = {
        studentName: result.Student?.fullName,
        registrationNumber: result.Student?.registrationNumber,
        department: result.Department?.name,
        year: result.Year?.name,
        exam: result.Exam?.name,
        time: new Date().toLocaleTimeString()
      };
    }
  } else if (entityType === "Student" && entityId) {
    const student = await Student.findByPk(entityId, {
      include: [{ model: Department }]
    });
    if (student) {
      details = {
        studentName: student.fullName,
        registrationNumber: student.registrationNumber,
        department: student.Department?.name,
        time: new Date().toLocaleTimeString()
      };
    }
  } else if (entityType === "Token" && entityId) {
    const token = await Token.findByPk(entityId, {
      include: [{ model: Student }]
    });
    if (token) {
      details = {
        studentName: token.Student?.fullName,
        registrationNumber: token.Student?.registrationNumber,
        time: new Date().toLocaleTimeString()
      };
    }
  } else if (entityType === "Admin" && entityId) {
     // Admin login details usually don't have much extra info unless we track IP
     details = {
       time: new Date().toLocaleTimeString()
     };
  }

  // 3. Send Emails
  const subject = formatSubject(type);
  
  // Send in parallel
  await Promise.all(admins.map(admin => 
    sendAdminNotificationEmail(admin.email, subject, message, details)
  ));
};

const formatSubject = (type) => {
  switch (type) {
    case "RESULT_UPLOAD": return "New Result Uploaded";
    case "STUDENT_CREATED": return "New Student Registered";
    case "TOKEN_GENERATED": return "New Token Generated";
    case "ADMIN_LOGIN": return "Admin Login Detected";
    case "PAYMENT_RECEIVED": return "Payment Received";
    default: return "System Notification";
  }
};

module.exports = {
  setIo,
  createNotification
};
