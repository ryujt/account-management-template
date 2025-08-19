const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  log_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  actor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  resource_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['actor_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['resource_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = AuditLog;