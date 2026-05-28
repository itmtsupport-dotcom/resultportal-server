module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create 'years' table
    await queryInterface.createTable("years", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
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

    // 2. Create 'exams' table
    await queryInterface.createTable("exams", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
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

    // 3. Create 'classes' table
    await queryInterface.createTable("classes", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
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

    // 4. Update 'courses' table
    // Since we are changing the schema significantly (courseCode -> classId), 
    // and assuming old data is incompatible or this is a dev environment as per context,
    // we will truncate the table to avoid integrity errors.
    // If you need to preserve data, you would need a more complex migration script.
    await queryInterface.bulkDelete("courses", null, { truncate: true, cascade: true });

    // Remove courseCode
    await queryInterface.removeColumn("courses", "courseCode");

    // Rename courseTitle to name
    await queryInterface.renameColumn("courses", "courseTitle", "name");

    // Add classId
    await queryInterface.addColumn("courses", "classId", {
      type: Sequelize.UUID,
      allowNull: false, // We can make it non-null because we truncated the table
      references: {
        model: "classes",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    });

    // Add units
    await queryInterface.addColumn("courses", "units", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Remove old unique index if it exists (departmentId + courseCode)
    try {
      await queryInterface.removeIndex("courses", ["departmentId", "courseCode"]);
    } catch (e) {
      // Index might not exist or have a different name, ignore error
      console.log("Index removal skipped or failed", e.message);
    }

    // Add new index (departmentId + classId)
    // Note: 'name' is also part of uniqueness usually but user didn't specify. 
    // The model has index on [departmentId, classId].
    // Wait, the model index in 'course.js' was:
    // indexes: [{ fields: ["departmentId", "classId"] }]
    // But uniqueness should probably include name too? 
    // "Course already exists in this class and department" logic in controller implies name+class+dept uniqueness.
    // However, the model definition only had dept+class index (non-unique? or unique?).
    // In `server/models/course.js` I wrote: `indexes: [{ fields: ["departmentId", "classId"] }]` (no unique: true).
    // So I will just add a non-unique index for performance, or unique if needed.
    // I'll follow the model definition which didn't specify unique: true explicitly in my previous write,
    // but the controller enforces uniqueness.
    
    await queryInterface.addIndex("courses", ["departmentId", "classId"]);
  },

  async down(queryInterface, Sequelize) {
    // Drop new tables
    await queryInterface.dropTable("years");
    await queryInterface.dropTable("exams");
    await queryInterface.dropTable("classes");

    // Revert courses changes (this is destructive as we lost data in up())
    await queryInterface.removeColumn("courses", "classId");
    await queryInterface.removeColumn("courses", "units");
    await queryInterface.renameColumn("courses", "name", "courseTitle");
    await queryInterface.addColumn("courses", "courseCode", {
      type: Sequelize.STRING,
      allowNull: true // Can't force non-null on existing rows without data
    });
    
    // We cannot restore data we truncated.
  }
};
