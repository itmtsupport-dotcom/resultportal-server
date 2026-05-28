const crypto = require("crypto");

const getEncryptionKey = () => {
  const raw = String(process.env.EMAIL_ENCRYPTION_KEY || process.env.JWT_SECRET || "default_secret_key_for_dev").trim();
  return crypto.createHash("sha256").update(raw).digest();
};

const encryptSecret = (value) => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(String(value));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
};

const decryptSecret = (value) => {
  try {
    if (!value) return null;
    const [ivHex, encryptedHex] = value.split(":");
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(Buffer.from(encryptedHex, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

module.exports = {
  encryptSecret,
  decryptSecret
};
