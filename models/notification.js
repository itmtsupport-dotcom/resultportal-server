const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      type: {
        type: DataTypes.STRING, // e.g., 'RESULT_UPLOAD', 'STUDENT_CREATED', 'TOKEN_GENERATED'
        allowNull: false
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false
      },
      entityType: {
        type: DataTypes.STRING, // e.g., 'Result', 'Student', 'Token'
        allowNull: true
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      tableName: "notifications",
      timestamps: true
    }
  );

  return Notification;
};
