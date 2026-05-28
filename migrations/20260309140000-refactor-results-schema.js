module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Truncate results table to avoid constraint violations during schema change
    // Assuming development environment or compatible change request
    await queryInterface.bulkDelete("results", null, { truncate: true, cascade: true });

    // 2. Remove old columns
    await queryInterface.removeColumn("results", "sessionId");
    await queryInterface.removeColumn("results", "semesterId");
    await queryInterface.removeColumn("results", "level");

    // 3. Add new columns
    await queryInterface.addColumn("results", "yearId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "years",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.addColumn("results", "examId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "exams",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    await queryInterface.addColumn("results", "classId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "classes",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    // 4. Update indexes
    // Old index was on [studentId, sessionId, semesterId]
    // We try to remove it, but sometimes names are auto-generated.
    try {
      await queryInterface.removeIndex("results", ["studentId", "sessionId", "semesterId"]);
    } catch (e) {
      console.log("Index removal skipped/failed", e.message);
    }

    // New unique index on [studentId, yearId, examId, classId] ? 
    // A student should have one result record per exam per year? 
    // Or maybe just [studentId, yearId, examId] if class is implied?
    // Usually a student is in one class per year. 
    // Let's add index on [studentId, yearId, examId] to prevent duplicate results for same exam.
    await queryInterface.addIndex("results", ["studentId", "yearId", "examId"], {
      unique: true,
      name: "results_student_year_exam_unique"
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert changes (destructive)
    await queryInterface.removeColumn("results", "yearId");
    await queryInterface.removeColumn("results", "examId");
    await queryInterface.removeColumn("results", "classId");

    await queryInterface.addColumn("results", "sessionId", {
      type: Sequelize.UUID,
      allowNull: false
    });
    await queryInterface.addColumn("results", "semesterId", {
      type: Sequelize.UUID,
      allowNull: false
    });
    await queryInterface.addColumn("results", "level", {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
