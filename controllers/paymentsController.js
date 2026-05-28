const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  sequelize,
  Payment,
  Student,
  Department,
  Class,
  Year,
  Token,
  Setting
} = require("../models");
const { generateTokenForStudent } = require("../services/tokenService");
const { sendTokenEmail, sendPaymentReceipt } = require("../services/emailService");
const { createNotification } = require("../services/notificationService");
const { decryptSecret } = require("../utils/encryption");

const paystackWebhook = async (req, res, next) => {
  try {
    // 1. Verify Signature
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      return res.status(401).json({ error: "Missing Paystack signature" });
    }

    // Fetch Secret Key from DB or Env
    let secret = process.env.PAYSTACK_SECRET_KEY;
    const setting = await Setting.findByPk("paystackSecretKey");
    if (setting && setting.value) {
        const decrypted = decryptSecret(setting.value);
        if (decrypted) {
            secret = decrypted;
        }
    }

    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // req.body is already raw buffer/string if configured in app.js, or object if json parsed
    // The app.js configures express.raw for this route, so req.body is a Buffer.
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse body
    const event = JSON.parse(req.body.toString());

    // 2. Confirm Event Type
    if (event.event !== "charge.success") {
      // We only care about success for now
      return res.status(200).send("Event ignored");
    }

    const data = event.data;
    const { reference, amount, currency, metadata, status } = data;
    
    // Paystack amount is in kobo (if NGN)
    const amountInMajor = currency === "NGN" ? amount / 100 : amount;

    // 3. Extract Payment Data & Metadata
    // metadata: { studentId, registrationNumber, departmentId, classId, yearId, studentName }
    const { studentId, registrationNumber, departmentId, classId, yearId, studentName } = metadata || {};

    if (!studentId) {
      console.error("Missing studentId in payment metadata", reference);
      return res.status(400).json({ error: "Missing metadata" });
    }

    // 4. Find or Create Payment Record
    // We use a transaction to ensure consistency
    await sequelize.transaction(async (t) => {
      // Check if payment already exists
      let payment = await Payment.findOne({
        where: { paymentReference: reference },
        transaction: t
      });

      if (!payment) {
        // Create new payment record
        payment = await Payment.create({
          studentId,
          registrationNumber,
          studentName,
          departmentId,
          classId,
          yearId,
          amount: amountInMajor,
          currency,
          paymentMethod: "paystack",
          paymentReference: reference,
          paystackReference: String(data.id), // Paystack transaction ID
          status: status === "success" ? "success" : "failed",
          metadata: data,
          createdAt: new Date()
        }, { transaction: t });
      } else {
        // Update existing
        if (payment.status !== "success" && status === "success") {
          payment.status = "success";
          payment.paystackReference = String(data.id);
          payment.metadata = data;
          await payment.save({ transaction: t });
        }
      }

      // 5. If Success, Generate Token & Notify
      if (status === "success") {
        // Check if token already generated for this payment? 
        // Logic: Generate token if not already given?
        // For simplicity, we generate a new token every successful payment.
        
        // Generate Token
        const token = await generateTokenForStudent(studentId, {
          expiresInDays: 90, // Default or from settings
          maxUsage: 5 // Default
        }, t);

        // Fetch student email for notification
        const student = await Student.findByPk(studentId, { transaction: t });
        
        // Send Email (Async, don't await strictly or catch error)
        try {
          if (student && student.email) {
            await sendTokenEmail(student.email, token.tokenCode, {
              studentName: student.fullName,
              registrationNumber: student.registrationNumber,
              expiresAt: token.expiresAt,
              maxUsage: token.maxUsage
            });
            
            await sendPaymentReceipt(student.email, amountInMajor, reference, new Date());
          }
        } catch (emailErr) {
          console.error("Failed to send payment emails:", emailErr);
        }

        // 6. Create System Notification
        try {
          await createNotification(
            "PAYMENT_RECEIVED",
            `Payment received from ${studentName || "Student"} – ${currency}${amountInMajor}`,
            "Payment",
            payment.id
          );
        } catch (notifErr) {
          console.error("Failed to create notification:", notifErr);
        }
      }
    });

    return res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Admin APIs ---

const listPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, departmentId, classId, yearId, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { studentName: { [Op.iLike]: `%${search}%` } },
        { registrationNumber: { [Op.iLike]: `%${search}%` } },
        { paymentReference: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (departmentId) where.departmentId = departmentId;
    if (classId) where.classId = classId;
    if (yearId) where.yearId = yearId;
    if (status) where.status = status;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Department, attributes: ["name"] },
        { model: Class, attributes: ["name"] },
        { model: Year, attributes: ["name"] }
      ]
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

const getPaymentStats = async (req, res, next) => {
  try {
    // Total Revenue
    const totalRevenue = await Payment.sum("amount", {
      where: { status: "success" }
    }) || 0;

    // Total Transactions
    const totalTransactions = await Payment.count();

    // Successful Payments
    const successfulPayments = await Payment.count({
      where: { status: "success" }
    });

    // Failed Payments
    const failedPayments = await Payment.count({
      where: { status: "failed" }
    });

    return res.status(200).json({
      totalRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments
    });
  } catch (error) {
    return next(error);
  }
};

const getPaymentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [
        { model: Student, attributes: ["fullName", "email", "registrationNumber"] },
        { model: Department, attributes: ["name"] },
        { model: Class, attributes: ["name"] },
        { model: Year, attributes: ["name"] }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.status(200).json(payment);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  paystackWebhook,
  listPayments,
  getPaymentStats,
  getPaymentDetails
};
