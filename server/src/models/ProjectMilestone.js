const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ProjectMilestone extends Model {}

ProjectMilestone.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Milestone title is required.' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
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
    status: {
      type: DataTypes.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'),
      allowNull: false,
      defaultValue: 'NOT_STARTED',
    },
  },
  {
    sequelize,
    modelName: 'ProjectMilestone',
    tableName: 'project_milestones',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ProjectMilestone;
