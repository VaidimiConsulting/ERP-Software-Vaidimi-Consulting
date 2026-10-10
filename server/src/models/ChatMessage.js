const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ChatMessage extends Model {}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message_type: {
      type: DataTypes.ENUM('TEXT', 'SYSTEM', 'ATTACHMENT'),
      defaultValue: 'TEXT',
    },
    attachment_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    attachment_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ChatMessage;
