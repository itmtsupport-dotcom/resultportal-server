module.exports = {
  async up(queryInterface, Sequelize) {
    // Update result-level uniqueness to include classId
    try {
      await queryInterface.removeIndex("results", "results_student_year_exam_unique");
    } catch (error) {
      // Index may already be absent
      console.log("Skipped removing old results unique index:", error.message);
    }

    await queryInterface.addIndex("results", ["studentId", "yearId", "examId", "classId"], {
      unique: true,
      name: "results_student_year_exam_class_unique"
    });

    // Enforce one course per result record to avoid duplicate course uploads
    await queryInterface.addIndex("result_items", ["resultId", "courseId"], {
      unique: true,
      name: "result_items_result_course_unique"
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex("results", "results_student_year_exam_class_unique");
    } catch (error) {
      console.log("Skipped removing updated results unique index:", error.message);
    }

    try {
      await queryInterface.removeIndex("result_items", "result_items_result_course_unique");
    } catch (error) {
      console.log("Skipped removing result items unique index:", error.message);
    }

    await queryInterface.addIndex("results", ["studentId", "yearId", "examId"], {
      unique: true,
      name: "results_student_year_exam_unique"
    });
  }
};
