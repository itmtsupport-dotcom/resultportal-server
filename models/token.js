const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Token = sequelize.define(
    "Token",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      tokenCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      maxUsage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4
      },
      usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "EXPIRED", "DISABLED", "EXHAUSTED"),
        allowNull: false
      }
    },
    {
      tableName: "tokens",
      timestamps: true
    }
  );

  return Token;
};
