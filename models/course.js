const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Course = sequelize.define(
    "Course",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      courseCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      classId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      departmentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      units: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: "courses",
      timestamps: true,
      indexes: [
        {
          fields: ["departmentId", "classId"]
        }
      ]
    }
  );

  return Course;
};
