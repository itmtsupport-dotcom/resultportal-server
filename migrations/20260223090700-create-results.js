module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("results", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      departmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "departments",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
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
      published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex(
      "results",
      ["studentId", "sessionId", "semesterId"],
      {
        unique: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("results");
  }
};
