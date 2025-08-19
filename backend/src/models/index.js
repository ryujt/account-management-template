const sequelize = require('../config/database');
const User = require('./User');
const Session = require('./Session');
const Invite = require('./Invite');
const AuditLog = require('./AuditLog');

// Define associations
User.hasMany(Session, {
  foreignKey: 'user_id',
  as: 'sessions'
});

Session.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Invite, {
  foreignKey: 'created_by',
  as: 'createdInvites'
});

Invite.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

User.hasMany(Invite, {
  foreignKey: 'accepted_by',
  as: 'acceptedInvites'
});

Invite.belongsTo(User, {
  foreignKey: 'accepted_by',
  as: 'acceptor'
});

User.hasMany(AuditLog, {
  foreignKey: 'actor_id',
  as: 'auditLogs'
});

AuditLog.belongsTo(User, {
  foreignKey: 'actor_id',
  as: 'actor'
});

module.exports = {
  sequelize,
  User,
  Session,
  Invite,
  AuditLog
};