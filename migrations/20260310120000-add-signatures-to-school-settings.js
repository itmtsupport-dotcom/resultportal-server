'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('school_settings', 'registrarSignature', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('school_settings', 'principalSignature', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('school_settings', 'registrarSignature');
    await queryInterface.removeColumn('school_settings', 'principalSignature');
  }
};