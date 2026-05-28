const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EmailLog = sequelize.define(
    "EmailLog",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      recipient: {
        type: DataTypes.STRING,
        allowNull: false
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("SENT", "FAILED"),
        allowNull: false
      },
      errorMessage: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "email_logs",
      timestamps: false
    }
  );

  return EmailLog;
};
