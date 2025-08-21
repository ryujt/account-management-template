const User = require('./User');
const Role = require('./Role');
const Session = require('./Session');
const EmailVerification = require('./EmailVerification');
const PasswordReset = require('./PasswordReset');

// Initialize models and their relationships
const initializeModels = async () => {
  try {
    // Initialize default roles
    await Role.initializeDefaults();
    console.log('Models initialized successfully');
  } catch (error) {
    console.error('Model initialization error:', error);
    throw error;
  }
};

module.exports = {
  User,
  Role,
  Session,
  EmailVerification,
  PasswordReset,
  initializeModels
};