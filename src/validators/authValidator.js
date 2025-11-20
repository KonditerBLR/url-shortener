const { ValidationError } = require('../utils/errors');
const config = require('../config');

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate registration request
 */
const validateRegister = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (password.length < config.password.minLength) {
    throw new ValidationError(
      `Password must be at least ${config.password.minLength} characters`
    );
  }

  next();
};

/**
 * Validate login request
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  next();
};

/**
 * Validate password reset request
 */
const validatePasswordReset = (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ValidationError('Token and password are required');
  }

  if (password.length < config.password.minLength) {
    throw new ValidationError(
      `Password must be at least ${config.password.minLength} characters`
    );
  }

  next();
};

/**
 * Validate change password request
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < config.password.minLength) {
    throw new ValidationError(
      `Password must be at least ${config.password.minLength} characters`
    );
  }

  next();
};

module.exports = {
  isValidEmail,
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
};
