const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LeaveBalance = sequelize.define(
  'LeaveBalance',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    leave_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
    },
    used_days: {
      type: DataTypes.DECIMAL(4, 1),
      defaultValue: 0.0,
      allowNull: false,
    },
    pending_days: {
      type: DataTypes.DECIMAL(4, 1),
      defaultValue: 0.0,
      allowNull: false,
    },
    remaining_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
    },
  },
  {
    tableName: 'leave_balances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'leave_type', 'year'],
        name: 'unique_employee_leave_type_year',
      },
    ],
  }
);

module.exports = LeaveBalance;
