const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SchoolSettings = sequelize.define(
    "SchoolSettings",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      schoolName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "International Technical Management Institute"
      },
      schoolLogo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      registrarSignature: {
        type: DataTypes.STRING,
        allowNull: true
      },
      principalSignature: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: "school_settings",
      timestamps: true
    }
  );

  return SchoolSettings;
};
