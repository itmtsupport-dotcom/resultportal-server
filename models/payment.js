const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
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
      registrationNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      studentName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      departmentId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      classId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      yearId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "NGN"
      },
      paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: "paystack"
      },
      paymentReference: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      paystackReference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("success", "pending", "failed"),
        defaultValue: "pending"
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
      }
    },
    {
      tableName: "payments",
      timestamps: true
    }
  );

  return Payment;
};
