const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { EmailSettings, EmailLog } = require("../models");

// Encryption Key Management
const getEncryptionKey = () => {
  const raw = String(process.env.EMAIL_ENCRYPTION_KEY || process.env.JWT_SECRET || "default_secret_key_for_dev").trim();
  return crypto.createHash("sha256").update(raw).digest();
};

const decryptSecret = (encryptedValue) => {
  if (!encryptedValue) return null;
  const raw = String(encryptedValue);
  
  // If not encrypted format, return as is (for dev/legacy)
  if (!raw.includes(":")) return raw;

  try {
    const key = getEncryptionKey();
    const parts = raw.split(":");
    if (parts.length < 2) return raw;
    
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return raw; // Fallback to raw value if decryption fails
  }
};

// Transporter Management
const getActiveTransporter = async () => {
  const settings = await EmailSettings.findOne({
    where: { isActive: true },
    order: [["updatedAt", "DESC"]]
  });

  if (!settings) {
    throw new Error("No active email configuration found.");
  }

  const smtpPassword = decryptSecret(settings.smtpPassword);

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: smtpPassword
    },
    tls: {
      rejectUnauthorized: false // Helpful for development/self-signed certs
    }
  });

  return { transporter, from: `"${settings.fromName}" <${settings.fromEmail}>` };
};

// Generic Send Function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const { transporter, from } = await getActiveTransporter();

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html
    });

    await EmailLog.create({
      recipient: to,
      subject,
      status: "SENT",
      errorMessage: null,
      createdAt: new Date()
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    
    await EmailLog.create({
      recipient: to,
      subject,
      status: "FAILED",
      errorMessage: error.message,
      createdAt: new Date()
    });

    return { success: false, error: error.message };
  }
};

// Templates
const sendTokenEmail = async (studentEmail, tokenCode, details = {}) => {
  const { studentName, registrationNumber, expiresAt, maxUsage } = details;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563EB; text-align: center;">Result Access Token</h2>
      <p>Dear <strong>${studentName || "Student"}</strong>,</p>
      <p>Your result access token has been generated successfully.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <p style="margin: 0; color: #6b7280; font-size: 0.9em;">TOKEN CODE</p>
        <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #111827;">${tokenCode}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; color: #6b7280;">Registration Number:</td>
          <td style="padding: 8px; font-weight: 500;">${registrationNumber || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Max Usage:</td>
          <td style="padding: 8px; font-weight: 500;">${maxUsage} times</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Expires On:</td>
          <td style="padding: 8px; font-weight: 500;">${new Date(expiresAt).toLocaleDateString()}</td>
        </tr>
      </table>

      <p>Use this token to check your results on the student portal.</p>
      <p style="font-size: 0.8em; color: #9ca3af; text-align: center; margin-top: 30px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;

  return sendEmail({
    to: studentEmail,
    subject: "Your Result Access Token",
    html
  });
};

const sendPaymentReceipt = async (email, amount, reference, paidAt) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #10B981; text-align: center;">Payment Successful</h2>
      <p>We have received your payment for the result access token.</p>
      
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; color: #6b7280;">Amount Paid:</td>
            <td style="padding: 8px; font-weight: bold; text-align: right;">₦${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #6b7280;">Reference:</td>
            <td style="padding: 8px; font-weight: 500; text-align: right;">${reference}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #6b7280;">Date:</td>
            <td style="padding: 8px; font-weight: 500; text-align: right;">${new Date(paidAt).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #6b7280;">Status:</td>
            <td style="padding: 8px; font-weight: bold; color: #10B981; text-align: right;">SUCCESSFUL</td>
          </tr>
        </table>
      </div>

      <p>Your access token has been sent in a separate email.</p>
      <p style="font-size: 0.8em; color: #9ca3af; text-align: center; margin-top: 30px;">
        Thank you for your business.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Payment Receipt - Result Portal",
    html
  });
};

const sendAdminNotificationEmail = async (adminEmail, subject, message, details = {}) => {
  const { studentName, registrationNumber, department, year, exam, time } = details;

  const detailRows = [];
  if (studentName) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Student:</td><td style="padding: 8px; font-weight: 500;">${studentName}</td></tr>`);
  if (registrationNumber) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Registration Number:</td><td style="padding: 8px; font-weight: 500;">${registrationNumber}</td></tr>`);
  if (department) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Department:</td><td style="padding: 8px; font-weight: 500;">${department}</td></tr>`);
  if (year) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Year:</td><td style="padding: 8px; font-weight: 500;">${year}</td></tr>`);
  if (exam) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Exam:</td><td style="padding: 8px; font-weight: 500;">${exam}</td></tr>`);
  if (time) detailRows.push(`<tr><td style="padding: 8px; color: #6b7280;">Time:</td><td style="padding: 8px; font-weight: 500;">${time}</td></tr>`);

  const detailsTable = detailRows.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 6px;">
      ${detailRows.join("")}
    </table>
  ` : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1f2937; padding: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 18px;">School System Notification</h2>
      </div>
      
      <div style="padding: 20px;">
        <h3 style="color: #111827; margin-top: 0;">${subject}</h3>
        <p style="color: #4b5563; line-height: 1.5;">${message}</p>
        
        ${detailsTable}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="${process.env.ADMIN_URL || '#'}" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500;">Go to Dashboard</a>
        </div>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated notification from the Result Management System.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} ITMT Result Portal</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `[Admin Alert] ${subject}`,
    html
  });
};

module.exports = {
  sendTokenEmail,
  sendPaymentReceipt,
  sendAdminNotificationEmail,
  sendEmail // Export generic sender for flexibility
};
