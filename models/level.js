const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Level = sequelize.define(
    "Level",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      tableName: "levels",
      timestamps: true
    }
  );

  return Level;
};
