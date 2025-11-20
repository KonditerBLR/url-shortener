const { ValidationError } = require('../utils/errors');
const config = require('../config');

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate short code format
 */
const isValidShortCode = (code) => {
  const regex = /^[a-zA-Z0-9-_]+$/;
  return regex.test(code);
};

/**
 * Validate URL shortening request
 */
const validateShortenRequest = (req, res, next) => {
  const { url, customCode, password, expiresInDays } = req.body;

  // Validate URL
  if (!url) {
    throw new ValidationError('URL is required');
  }

  if (!isValidUrl(url)) {
    throw new ValidationError('Invalid URL format');
  }

  // Validate custom code if provided
  if (customCode) {
    if (!isValidShortCode(customCode)) {
      throw new ValidationError(
        'Custom code can only contain letters, numbers, hyphens and underscores'
      );
    }

    const { customCodeMinLength, customCodeMaxLength } = config.shortCode;
    if (customCode.length < customCodeMinLength || customCode.length > customCodeMaxLength) {
      throw new ValidationError(
        `Custom code must be between ${customCodeMinLength} and ${customCodeMaxLength} characters`
      );
    }
  }

  // Validate password if provided
  if (password && password.trim() !== '') {
    if (password.length < config.password.linkPasswordMinLength) {
      throw new ValidationError(
        `Password must be at least ${config.password.linkPasswordMinLength} characters`
      );
    }
  }

  // Validate expiration if provided
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const days = parseInt(expiresInDays);
    if (isNaN(days) || days < 1) {
      throw new ValidationError('Expiration must be at least 1 day');
    }
  }

  next();
};

/**
 * Validate expiration date
 */
const validateExpiration = (req, res, next) => {
  const { expires_at } = req.body;

  if (expires_at !== null && expires_at !== undefined) {
    const expirationDate = new Date(expires_at);

    if (isNaN(expirationDate.getTime())) {
      throw new ValidationError('Invalid expiration date');
    }

    if (expirationDate <= new Date()) {
      throw new ValidationError('Expiration date must be in the future');
    }
  }

  next();
};

module.exports = {
  isValidUrl,
  isValidShortCode,
  validateShortenRequest,
  validateExpiration,
};
