const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Department extends Model {}

Department.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    department_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: 'Department name already exists.',
      },
      validate: {
        notEmpty: { msg: 'Department name is required.' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Department;
