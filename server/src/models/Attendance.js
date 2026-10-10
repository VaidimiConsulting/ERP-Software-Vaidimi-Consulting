const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ATTENDANCE_STATUS } = require('../config/constants');

const Attendance = sequelize.define(
  'Attendance',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    check_in: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    working_hours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        ATTENDANCE_STATUS.PRESENT,
        ATTENDANCE_STATUS.ABSENT,
        ATTENDANCE_STATUS.HALF_DAY,
        ATTENDANCE_STATUS.ON_LEAVE,
        ATTENDANCE_STATUS.HOLIDAY
      ),
      defaultValue: ATTENDANCE_STATUS.PRESENT,
      allowNull: false,
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    is_manual_override: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_late: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_on_break: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    break_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    break_end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total_break_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    current_work_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'NOT_CHECKED_IN',
      allowNull: false,
    },
  },
  {
    tableName: 'attendances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'date'],
        name: 'unique_employee_attendance_date',
      },
      {
        fields: ['date'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

module.exports = Attendance;
