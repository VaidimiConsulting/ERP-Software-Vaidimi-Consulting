const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const { TASK_STATUS, TASK_PRIORITY } = require('../config/constants');

class Task extends Model {}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    task_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Task code must be unique.',
      },
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Task title is required.' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM(
        TASK_PRIORITY.LOW,
        TASK_PRIORITY.MEDIUM,
        TASK_PRIORITY.HIGH,
        TASK_PRIORITY.URGENT
      ),
      allowNull: false,
      defaultValue: TASK_PRIORITY.MEDIUM,
    },
    status: {
      type: DataTypes.ENUM(
        TASK_STATUS.TODO,
        TASK_STATUS.IN_PROGRESS,
        TASK_STATUS.COMPLETED,
        TASK_STATUS.BLOCKED
      ),
      allowNull: false,
      defaultValue: TASK_STATUS.TODO,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    progress_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completion_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Task;
