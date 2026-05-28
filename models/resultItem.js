const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ResultItem = sequelize.define(
    "ResultItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      resultId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      grade: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: "result_items",
      timestamps: true
    }
  );

  return ResultItem;
};
