const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ChatParticipant extends Model {}

ChatParticipant.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'MEMBER'),
      defaultValue: 'MEMBER',
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ChatParticipant',
    tableName: 'chat_participants',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['conversation_id', 'user_id'],
      },
    ],
  }
);

module.exports = ChatParticipant;
