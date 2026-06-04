const { DataTypes } = require("sequelize");
const crypto = require("crypto");

module.exports = (sequelize) => {
  const generateVerificationCode = (date) => {
    const year = (date || new Date()).getFullYear();
    const token = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `UNI-${year}-${token}`;
  };

  const Result = sequelize.define(
    "Result",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      departmentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      yearId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      examId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      classId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      verificationCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      issuedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: "results",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["studentId", "yearId", "examId", "classId"]
        },
        {
          unique: true,
          fields: ["verificationCode"]
        }
      ]
    }
  );

  Result.addHook("beforeValidate", async (result) => {
    if (!result.issuedAt) {
      result.issuedAt = new Date();
    }
    if (!result.verificationCode) {
      let code = generateVerificationCode(result.issuedAt);
      let exists = await Result.findOne({
        where: { verificationCode: code }
      });
      let attempts = 0;
      while (exists && attempts < 5) {
        code = generateVerificationCode(result.issuedAt);
        exists = await Result.findOne({ where: { verificationCode: code } });
        attempts += 1;
      }
      if (exists) {
        throw new Error("Unable to generate unique verification code");
      }
      result.verificationCode = code;
    }
  });

  return Result;
};
