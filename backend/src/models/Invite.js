const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invite = sequelize.define('Invite', {
  invite_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  invite_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'member'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  accepted_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['invite_code']
    },
    {
      fields: ['email']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = Invite;