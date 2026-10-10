const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const { PROJECT_STATUS, PROJECT_PRIORITY } = require('../config/constants');

class Project extends Model {}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Project code must be unique.',
      },
    },
    project_name: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Project name is required.' },
      },
    },
    client_name: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    technology_stack: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM(
        PROJECT_PRIORITY.LOW,
        PROJECT_PRIORITY.MEDIUM,
        PROJECT_PRIORITY.HIGH,
        PROJECT_PRIORITY.URGENT
      ),
      allowNull: false,
      defaultValue: PROJECT_PRIORITY.MEDIUM,
    },
    project_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expected_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    actual_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        PROJECT_STATUS.NOT_STARTED,
        PROJECT_STATUS.PLANNING,
        PROJECT_STATUS.IN_PROGRESS,
        PROJECT_STATUS.ON_HOLD,
        PROJECT_STATUS.COMPLETED,
        PROJECT_STATUS.CANCELLED
      ),
      allowNull: false,
      defaultValue: PROJECT_STATUS.NOT_STARTED,
    },
    completion_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Project;
