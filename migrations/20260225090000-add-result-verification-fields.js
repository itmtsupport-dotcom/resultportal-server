const crypto = require("crypto");

const buildCode = (date) => {
  const year = (date || new Date()).getFullYear();
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `UNI-${year}-${token}`;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("results", "verificationCode", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("results", "issuedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW
    });

    await queryInterface.sequelize.query(
      'UPDATE "results" SET "issuedAt" = "createdAt" WHERE "issuedAt" IS NULL'
    );

    const [rows] = await queryInterface.sequelize.query(
      'SELECT id, "issuedAt" FROM "results" WHERE "verificationCode" IS NULL'
    );

    const used = new Set();
    for (const row of rows) {
      let code = buildCode(row.issuedAt);
      while (used.has(code)) {
        code = buildCode(row.issuedAt);
      }
      used.add(code);
      await queryInterface.bulkUpdate(
        "results",
        { verificationCode: code },
        { id: row.id }
      );
    }

    await queryInterface.changeColumn("results", "verificationCode", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("results", "issuedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    });

    await queryInterface.addIndex("results", ["verificationCode"], {
      unique: true,
      name: "results_verification_code_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "results",
      "results_verification_code_unique"
    );
    await queryInterface.removeColumn("results", "verificationCode");
    await queryInterface.removeColumn("results", "issuedAt");
  }
};
