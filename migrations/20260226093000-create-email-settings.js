module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("email_settings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      provider: {
        type: Sequelize.ENUM("SMTP", "SENDGRID"),
        allowNull: false
      },
      smtpHost: {
        type: Sequelize.STRING,
        allowNull: true
      },
      smtpPort: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      smtpUser: {
        type: Sequelize.STRING,
        allowNull: true
      },
      smtpPassword: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fromEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fromName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex("email_settings", ["isActive"], {
      unique: true,
      where: {
        isActive: true
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("email_settings");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_email_settings_provider";'
    );
  }
};
