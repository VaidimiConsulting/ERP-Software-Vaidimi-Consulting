const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../config/constants');

const LeaveRequest = sequelize.define(
  'LeaveRequest',
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
      type: DataTypes.ENUM(
        LEAVE_TYPES.PAID_LEAVE,
        LEAVE_TYPES.UNPAID_LEAVE,
        LEAVE_TYPES.SICK_LEAVE,
        LEAVE_TYPES.CASUAL_LEAVE,
        LEAVE_TYPES.FESTIVAL_LEAVE,
        LEAVE_TYPES.MENSTRUAL_LEAVE
      ),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
    },
    is_half_day: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        LEAVE_STATUS.PENDING,
        LEAVE_STATUS.APPROVED,
        LEAVE_STATUS.REJECTED,
        LEAVE_STATUS.CANCELLED
      ),
      defaultValue: LEAVE_STATUS.PENDING,
      allowNull: false,
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    admin_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'leave_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['employee_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['start_date', 'end_date'],
      },
    ],
  }
);

module.exports = LeaveRequest;
