const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
} = require('../validators/authValidator');

/**
 * POST /api/auth/register - Register new user
 */
router.post(
  '/register',
  validateRegister,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.json(result);
  })
);

/**
 * POST /api/auth/login - Login user
 */
router.post(
  '/login',
  validateLogin,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  })
);

/**
 * POST /api/auth/forgot-password - Request password reset
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  })
);

/**
 * POST /api/auth/reset-password - Reset password
 */
router.post(
  '/reset-password',
  validatePasswordReset,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    res.json(result);
  })
);

/**
 * GET /api/user/profile - Get user profile
 */
router.get(
  '/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.userId);
    res.json(profile);
  })
);

/**
 * POST /api/user/change-password - Change password
 */
router.post(
  '/change-password',
  authenticateToken,
  validateChangePassword,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );
    res.json(result);
  })
);

module.exports = router;
