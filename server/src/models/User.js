const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { ROLES } = require('../config/constants');

class User extends Model {
  // Method to check password validity
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: {
        msg: 'This email address is already registered.',
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address.',
        },
      },
      set(value) {
        this.setDataValue('email', value.trim().toLowerCase());
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    saved_password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE),
      allowNull: false,
      defaultValue: ROLES.EMPLOYEE,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    // By default, NEVER return password_hash or saved_password in public queries for safety
    defaultScope: {
      attributes: { exclude: ['password_hash', 'saved_password'] },
    },
    scopes: {
      // Explicitly used during login authentication
      withPassword: {
        attributes: {},
      },
      // Explicitly used when Admin views employee credentials
      withSavedPassword: {
        attributes: { exclude: ['password_hash'] },
      },
    },
    hooks: {
      // Automatically store saved_password and hash password before create
      beforeCreate: async (user) => {
        if (user.password_hash) {
          if (!user.saved_password) {
            user.saved_password = user.password_hash;
          }
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
      // Automatically store saved_password and hash password before update if changed
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          if (!user.changed('saved_password')) {
            user.saved_password = user.password_hash;
          }
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
    },
  }
);

module.exports = User;
