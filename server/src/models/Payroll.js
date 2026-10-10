const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payroll = sequelize.define(
  'Payroll',
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
    month: {
      type: DataTypes.STRING(7), // 'YYYY-MM'
      allowNull: false,
    },
    base_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    total_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    payable_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    present_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    half_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    absent_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    paid_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    unpaid_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    sick_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    casual_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    festival_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    menstrual_leaves: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    sundays_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    holidays_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bonus: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    gross_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    deductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    net_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    payment_status: {
      type: DataTypes.ENUM('GENERATED', 'PAID', 'PENDING'),
      allowNull: false,
      defaultValue: 'GENERATED',
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_sent_to_employee: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'payrolls',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'month'],
        name: 'unique_employee_month_payroll',
      },
    ],
  }
);

module.exports = Payroll;
