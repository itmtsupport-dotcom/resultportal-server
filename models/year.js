const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Year = sequelize.define(
    "Year",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: "years",
      timestamps: true
    }
  );

  return Year;
};
