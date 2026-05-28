module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("result_edit_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      resultId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "results",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      adminId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "admins",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      fieldChanged: {
        type: Sequelize.STRING,
        allowNull: false
      },
      oldValue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      newValue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("result_edit_logs");
  }
};
