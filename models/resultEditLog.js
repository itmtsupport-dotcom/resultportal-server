const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ResultEditLog = sequelize.define(
    "ResultEditLog",
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
      adminId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      fieldChanged: {
        type: DataTypes.STRING,
        allowNull: false
      },
      oldValue: {
        type: DataTypes.STRING,
        allowNull: true
      },
      newValue: {
        type: DataTypes.STRING,
        allowNull: true
      },
      editedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "result_edit_logs",
      timestamps: false
    }
  );

  return ResultEditLog;
};
