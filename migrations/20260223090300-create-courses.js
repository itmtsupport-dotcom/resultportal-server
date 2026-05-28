module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("courses", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      courseCode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      courseTitle: {
        type: Sequelize.STRING,
        allowNull: false
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("courses", ["departmentId", "courseCode"], {
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("courses");
  }
};
