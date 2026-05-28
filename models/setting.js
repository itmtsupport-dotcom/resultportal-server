const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Setting = sequelize.define("Setting", {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    timestamps: true,
  });

  return Setting;
};
