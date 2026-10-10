const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ProjectMember extends Model {}

ProjectMember.init(
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
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role_in_project: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Project Contributor',
    },
    assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ProjectMember',
    tableName: 'project_members',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'employee_id'],
        name: 'unique_project_employee_member',
      },
    ],
  }
);

module.exports = ProjectMember;
