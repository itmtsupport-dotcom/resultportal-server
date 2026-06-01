module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_payments_status_new" AS ENUM (\'pending\', \'success\', \'failed\');',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'ALTER TABLE "payments" ALTER COLUMN "status" TYPE "enum_payments_status_new" USING LOWER(status)::text::"enum_payments_status_new";',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE "enum_payments_status";',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_payments_status_new" RENAME TO "enum_payments_status";',
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_payments_status_old" AS ENUM (\'PENDING\', \'SUCCESS\', \'FAILED\');',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'ALTER TABLE "payments" ALTER COLUMN "status" TYPE "enum_payments_status_old" USING UPPER(status)::text::"enum_payments_status_old";',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE "enum_payments_status";',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_payments_status_old" RENAME TO "enum_payments_status";',
        { transaction }
      );
    });
  }
};
