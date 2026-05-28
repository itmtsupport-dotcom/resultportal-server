const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TokenUsageLog = sequelize.define(
    "TokenUsageLog",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      tokenId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      resultId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      sessionId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      semesterId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      level: {
        type: DataTypes.STRING,
        allowNull: true
      },
      departmentId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      yearId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      examId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      classId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      }
    },
    {
      tableName: "token_usage_logs",
      timestamps: false
    }
  );

  return TokenUsageLog;
};
