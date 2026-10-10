const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ChatConversation extends Model {}

ChatConversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('DIRECT', 'GROUP'),
      allowNull: false,
      defaultValue: 'DIRECT',
    },
    title: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('PROJECT', 'INTERN', 'DEPARTMENT', 'GENERAL', 'DIRECT'),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    last_message_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ChatConversation',
    tableName: 'chat_conversations',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ChatConversation;
