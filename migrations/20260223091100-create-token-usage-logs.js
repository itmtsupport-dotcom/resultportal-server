module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("token_usage_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tokenId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "tokens",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      resultId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "results",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      sessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "sessions",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      semesterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "semesters",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      level: {
        type: Sequelize.STRING,
        allowNull: false
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("token_usage_logs");
  }
};
