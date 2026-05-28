const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Semester = sequelize.define(
    "Semester",
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
      tableName: "semesters",
      timestamps: true
    }
  );

  return Semester;
};
