const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EmailSettings = sequelize.define(
    "EmailSettings",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      provider: {
        type: DataTypes.ENUM("SMTP", "SENDGRID"),
        allowNull: false
      },
      smtpHost: {
        type: DataTypes.STRING,
        allowNull: true
      },
      smtpPort: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      smtpUser: {
        type: DataTypes.STRING,
        allowNull: true
      },
      smtpPassword: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fromEmail: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fromName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: "email_settings",
      timestamps: true
    }
  );

  return EmailSettings;
};
