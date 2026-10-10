const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Branch extends Model {}

Branch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    branch_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Branch code must be unique.',
      },
      validate: {
        notEmpty: { msg: 'Branch code is required.' },
      },
    },
    branch_name: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Branch name is required.' },
      },
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'City is required.' },
      },
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    branch_head_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Branch',
    tableName: 'branches',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Branch;
