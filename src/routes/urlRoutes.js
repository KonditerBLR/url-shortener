const express = require('express');
const router = express.Router();
const urlService = require('../services/urlService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validateShortenRequest, validateExpiration } = require('../validators/urlValidator');

/**
 * GET /api/urls/user - Get all user's URLs
 */
router.get(
  '/user',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const urls = await urlService.getUserUrls(req.user.userId);
    res.json(urls);
  })
);

/**
 * POST /api/shorten - Create short URL
 */
router.post(
  '/shorten',
  validateShortenRequest,
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId || null;
    const result = await urlService.createShortUrl(req.body, userId);
    res.json(result);
  })
);

/**
 * GET /api/urls/:id/stats - Get URL statistics
 */
router.get(
  '/:id/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = 'all' } = req.query;
    const stats = await urlService.getStats(id, req.user.userId, period);
    res.json(stats);
  })
);

/**
 * DELETE /api/urls/:id - Delete URL
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await urlService.deleteUrl(id, req.user.userId);
    res.json(result);
  })
);

/**
 * POST /api/urls/:id/starred - Toggle starred status
 */
router.post(
  '/:id/starred',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await urlService.toggleStarred(id, req.user.userId);
    res.json(result);
  })
);

/**
 * PUT /api/urls/:id/description - Update description
 */
router.put(
  '/:id/description',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;
    const result = await urlService.updateDescription(id, req.user.userId, description);
    res.json(result);
  })
);

/**
 * POST /api/urls/:id/archived - Toggle archived status
 */
router.post(
  '/:id/archived',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await urlService.toggleArchived(id, req.user.userId);
    res.json(result);
  })
);

/**
 * PUT /api/urls/:id/password - Update password
 */
router.put(
  '/:id/password',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const result = await urlService.updatePassword(id, req.user.userId, password);
    res.json(result);
  })
);

/**
 * PUT /api/urls/:id/expiration - Update expiration
 */
router.put(
  '/:id/expiration',
  authenticateToken,
  validateExpiration,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expires_at } = req.body;
    const result = await urlService.updateExpiration(id, req.user.userId, expires_at);
    res.json(result);
  })
);

module.exports = router;
