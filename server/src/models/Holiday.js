const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Holiday = sequelize.define(
  'Holiday',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    applicable_to: {
      type: DataTypes.STRING(50),
      defaultValue: 'ALL',
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'holidays',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['date'],
      },
      {
        fields: ['year'],
      },
    ],
  }
);

module.exports = Holiday;
