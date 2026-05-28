const axios = require("axios");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Setting, EmailSettings, SystemLog } = require("../models");
const { encryptSecret, decryptSecret } = require("../utils/encryption");

// --- Paystack Integration ---

const testPaystackConnection = async (req, res, next) => {
  try {
    const { email, amount } = req.body;
    // The secret key is sent in the Authorization header by the client for testing, 
    // OR retrieved from DB if testing saved settings.
    // For initial setup test, client sends key in header.
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header missing" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { 
        email: email || "azdigitalsacademy@gmail.com", 
        amount: amount || 10000 
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    return res.status(400).json({ error: "Paystack connection failed: " + msg });
  }
};

const savePaystackSettings = async (req, res, next) => {
  try {
    const { publicKey, secretKey, tokenPrice } = req.body;

    if (!publicKey || !secretKey) {
      return res.status(400).json({ error: "Public Key and Secret Key are required" });
    }

    // Save Public Key (plain text is fine, but let's encrypt secret)
    await Setting.upsert({
      key: "paystackPublicKey",
      value: publicKey,
      isEncrypted: false,
      description: "Paystack Public Key"
    });

    // Save Secret Key (Encrypted)
    const encryptedSecret = encryptSecret(secretKey);
    await Setting.upsert({
      key: "paystackSecretKey",
      value: encryptedSecret,
      isEncrypted: true,
      description: "Paystack Secret Key"
    });

    // Save Token Price
    if (tokenPrice) {
      await Setting.upsert({
        key: "tokenPrice",
        value: String(tokenPrice),
        isEncrypted: false,
        description: "Price per token in NGN"
      });
    }

    await SystemLog.create({
      eventType: "SETTINGS_UPDATE",
      eventCategory: "System",
      description: "Paystack configuration updated",
      userType: "Admin",
      userId: req.user?.id,
      status: "Success"
    });

    return res.status(200).json({ message: "Paystack settings saved successfully" });
  } catch (error) {
    return next(error);
  }
};

// --- SMTP Integration ---

const testSmtpConnection = async (req, res, next) => {
  try {
    const { host, port, user, pass, encryption, senderEmail, senderName, recipient } = req.body;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465 || encryption === "ssl",
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();

    // Send actual test email
    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipient,
      subject: "SMTP Configuration Test - ITMT Portal",
      text: "Your SMTP server is configured successfully. This is a test email from the ITMT Result Portal.",
      html: "<p>Your SMTP server is configured successfully.</p><p>This is a test email from the <strong>ITMT Result Portal</strong>.</p>"
    });

    return res.status(200).json({ message: "SMTP connection verified and test email sent" });
  } catch (error) {
    return res.status(400).json({ error: "SMTP Connection failed: " + error.message });
  }
};

const saveSmtpSettings = async (req, res, next) => {
  try {
    const { 
      smtpHost, smtpPort, smtpUser, smtpPassword, 
      smtpEncryption, smtpSenderEmail, smtpSenderName 
    } = req.body;

    const encryptedPassword = encryptSecret(smtpPassword);

    // We can use the existing EmailSettings model or migrate to Setting model.
    // Let's stick to EmailSettings as it's already used by notification service.
    
    // Deactivate old settings
    await EmailSettings.update({ isActive: false }, { where: {} });

    await EmailSettings.create({
      provider: "SMTP",
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpUser,
      smtpPassword: encryptedPassword,
      fromEmail: smtpSenderEmail,
      fromName: smtpSenderName,
      isActive: true
    });

    await SystemLog.create({
      eventType: "SETTINGS_UPDATE",
      eventCategory: "System",
      description: "SMTP configuration updated",
      userType: "Admin",
      userId: req.user?.id,
      status: "Success"
    });

    return res.status(200).json({ message: "SMTP settings saved successfully" });
  } catch (error) {
    return next(error);
  }
};

const saveIntegrationSettings = async (req, res, next) => {
  try {
    const { 
      paystackPublicKey, paystackSecretKey, tokenPrice,
      smtpHost, smtpPort, smtpUser, smtpPassword, 
      smtpEncryption, smtpSenderEmail, smtpSenderName 
    } = req.body;

    // Save Paystack
    if (paystackPublicKey) {
        await Setting.upsert({
            key: "paystackPublicKey",
            value: paystackPublicKey,
            isEncrypted: false,
            description: "Paystack Public Key"
        });
    }

    if (paystackSecretKey && paystackSecretKey !== "sk_live_********") {
        const encryptedSecret = encryptSecret(paystackSecretKey);
        await Setting.upsert({
            key: "paystackSecretKey",
            value: encryptedSecret,
            isEncrypted: true,
            description: "Paystack Secret Key"
        });
    } else {
        // If it's the masked value, we assume it's already set correctly in DB.
        // But what if it's NOT set in DB? The user sees masked value because we returned it?
        // We only return masked value IF it exists in DB. So if user sends masked value back,
        // it means they didn't change it. So we do nothing.
    }

    if (tokenPrice) {
        await Setting.upsert({
            key: "tokenPrice",
            value: String(tokenPrice),
            isEncrypted: false,
            description: "Price per token in NGN"
        });
    }

    // Save SMTP
    if (smtpHost && smtpUser && smtpPassword) {
        const encryptedPassword = encryptSecret(smtpPassword);
        
        // Check if settings exist to update or create new
        const existing = await EmailSettings.findOne({ where: { isActive: true } });
        
        if (existing) {
             await existing.update({
                smtpHost,
                smtpPort: Number(smtpPort),
                smtpUser,
                smtpPassword: encryptedPassword,
                fromEmail: smtpSenderEmail,
                fromName: smtpSenderName,
             });
        } else {
            await EmailSettings.create({
                provider: "SMTP",
                smtpHost,
                smtpPort: Number(smtpPort),
                smtpUser,
                smtpPassword: encryptedPassword,
                fromEmail: smtpSenderEmail,
                fromName: smtpSenderName,
                isActive: true
            });
        }
    }

    await SystemLog.create({
        eventType: "SETTINGS_UPDATE",
        eventCategory: "System",
        description: "Integration settings updated (Paystack/SMTP)",
        userType: "Admin",
        userId: req.user?.id,
        status: "Success"
    });

    return res.status(200).json({ message: "Integration settings saved successfully" });
  } catch (error) {
      return next(error);
  }
};

const getIntegrationSettings = async (req, res, next) => {
    try {
        const paystackPub = await Setting.findByPk("paystackPublicKey");
        const paystackSec = await Setting.findByPk("paystackSecretKey");
        const tokenPrice = await Setting.findByPk("tokenPrice");
        
        const emailSettings = await EmailSettings.findOne({ where: { isActive: true } });

        // Decrypt secret key for frontend? No, security risk. Send masked or empty.
        // Usually, we send back public key and empty secret (or placeholder).
        
        let decryptedPaystackSecret = "";
        if (paystackSec) {
             // decryptedPaystackSecret = decryptSecret(paystackSec.value); 
             // Ideally don't send this back. But for "Edit" forms sometimes needed.
             // Better practice: placeholder. User re-enters if changing.
             decryptedPaystackSecret = "sk_live_********"; // Keep empty for security
        }

        let decryptedSmtpPassword = "";
        // Same for SMTP password

        res.json({
            paystackPublicKey: paystackPub?.value || "",
            paystackSecretKey: decryptedPaystackSecret, // masked
            tokenPrice: tokenPrice?.value || "1500",
            smtpHost: emailSettings?.smtpHost || "",
            smtpPort: emailSettings?.smtpPort || "",
            smtpUser: emailSettings?.smtpUser || "",
            smtpPassword: "", // masked
            smtpSenderEmail: emailSettings?.fromEmail || "",
            smtpSenderName: emailSettings?.fromName || "",
            smtpEncryption: emailSettings?.smtpPort === 465 ? "ssl" : "tls" 
        });

    } catch (error) {
        next(error);
    }
}

const handlePaystackWebhook = async (req, res, next) => {
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
        // Decrypt only when using it
        const decrypted = decryptSecret(setting.value);
        if (decrypted) {
            secret = decrypted;
        }
    }

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash == signature) {
      // Retrieve the request's body
      const event = req.body;
      // Process event here
      return res.status(200).json({ status: "success" });
    }

    return res.status(400).json({ error: "Invalid signature" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  testPaystackConnection,
  savePaystackSettings,
  testSmtpConnection,
  saveSmtpSettings,
  saveIntegrationSettings,
  getIntegrationSettings,
  handlePaystackWebhook
};
