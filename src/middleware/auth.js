const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errors');
const config = require('../config');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Token not provided');
  }

  try {
    const user = jwt.verify(token, config.jwt.secret);
    req.user = user;
    next();
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token, but attaches user if valid token exists
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = jwt.verify(token, config.jwt.secret);
    req.user = user;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
