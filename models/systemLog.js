const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SystemLog = sequelize.define("SystemLog", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eventCategory: {
      type: DataTypes.STRING,
      allowNull: false, // Admin Action, Student Activity, System Error, etc.
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userType: {
      type: DataTypes.STRING, // Admin, Student, System
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deviceInfo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Success", "Failed", "Warning", "Info"),
      defaultValue: "Info",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['eventType']
      },
      {
        fields: ['eventCategory']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return SystemLog;
};
