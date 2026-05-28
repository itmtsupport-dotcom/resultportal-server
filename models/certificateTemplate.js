const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CertificateTemplate = sequelize.define(
    "CertificateTemplate",
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      templateHtml: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      tableName: "certificate_templates",
      timestamps: true
    }
  );

  return CertificateTemplate;
};
