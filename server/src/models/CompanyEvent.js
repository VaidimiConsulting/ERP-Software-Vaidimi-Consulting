const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CompanyEvent = sequelize.define(
  'CompanyEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.ENUM('EVENT', 'MEETING', 'HOLIDAY', 'TRAINING', 'ANNOUNCEMENT'),
      defaultValue: 'EVENT',
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_all_day: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'company_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = CompanyEvent;
