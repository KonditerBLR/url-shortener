require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '30d',
  },

  // Base URL configuration
  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Rate limiting configuration
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
    },
  },

  // Short code configuration
  shortCode: {
    length: 6,
    chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    customCodeMinLength: 3,
    customCodeMaxLength: 50,
  },

  // Password configuration
  password: {
    minLength: 8,
    saltRounds: 10,
    linkPasswordMinLength: 4,
  },

  // API Key configuration
  apiKey: {
    maxPerUser: 10,
    prefix: 'sk_',
  },

  // Webhook configuration
  webhook: {
    maxPerUser: 5,
    timeout: 10000, // 10 seconds
    validEvents: ['link.clicked', 'link.created'],
  },

  // Pagination
  pagination: {
    defaultLimit: 50,
    maxLimit: 100,
  },

  // Email configuration (for production, use real SMTP)
  email: {
    from: '"CutTo Support" <noreply@cutto.tech>',
    resetTokenExpiry: 60 * 60 * 1000, // 1 hour
  },
};
