
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const KnowledgeBase = sequelize.define(
    "KnowledgeBase",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      question: {
        type: DataTypes.STRING,
        allowNull: false
      },
      keywords: {
        type: DataTypes.JSONB, // Stores array of keywords
        allowNull: false,
        defaultValue: []
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "General" // General, Payment, Result, Technical
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      tableName: "knowledge_base",
      timestamps: true
    }
  );

  return KnowledgeBase;
};
