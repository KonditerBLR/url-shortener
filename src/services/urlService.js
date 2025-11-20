const urlRepository = require('../repositories/urlRepository');
const clickRepository = require('../repositories/clickRepository');
const { generateShortCode } = require('../../utils');
const { NotFoundError, ConflictError } = require('../utils/errors');
const config = require('../config');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');

/**
 * URL Service - contains business logic for URL operations
 */
class UrlService {
  /**
   * Create shortened URL
   */
  async createShortUrl(urlData, userId = null) {
    const { url, customCode, password, expiresInDays } = urlData;
    let shortCode;

    // Use custom code if provided
    if (customCode) {
      // Check if custom code already exists
      const exists = await urlRepository.findByShortCode(customCode);
      if (exists) {
        throw new ConflictError('This custom code is already taken. Please choose another one.');
      }
      shortCode = customCode;
    } else {
      // Generate random code
      shortCode = generateShortCode();
      let exists = await urlRepository.findByShortCode(shortCode);

      // Keep generating until we find a unique one
      while (exists) {
        shortCode = generateShortCode();
        exists = await urlRepository.findByShortCode(shortCode);
      }
    }

    // Handle password protection
    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, config.password.saltRounds);
    }

    // Handle expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create URL in database
    await urlRepository.create({
      originalUrl: url,
      shortCode,
      userId,
      passwordHash,
      expiresAt,
    });

    // Generate short URL and QR code
    const shortUrl = `${config.app.baseUrl}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    return {
      success: true,
      originalUrl: url,
      shortUrl,
      shortCode,
      qrCode,
      has_password: !!passwordHash,
      expires_at: expiresAt,
    };
  }

  /**
   * Get URL by short code
   */
  async getUrlByShortCode(shortCode) {
    const url = await urlRepository.findByShortCode(shortCode);
    if (!url) {
      throw new NotFoundError('Short URL not found');
    }
    return url;
  }

  /**
   * Get all URLs for a user
   */
  async getUserUrls(userId) {
    return await urlRepository.findByUserId(userId);
  }

  /**
   * Delete URL
   */
  async deleteUrl(id, userId) {
    const deleted = await urlRepository.deleteByIdAndUserId(id, userId);
    if (!deleted) {
      throw new NotFoundError('Link not found');
    }
    return { success: true };
  }

  /**
   * Toggle starred status
   */
  async toggleStarred(id, userId) {
    const result = await urlRepository.toggleStarred(id, userId);
    if (!result) {
      throw new NotFoundError('Link not found');
    }
    return result;
  }

  /**
   * Update description
   */
  async updateDescription(id, userId, description) {
    const result = await urlRepository.updateDescription(id, userId, description);
    if (!result) {
      throw new NotFoundError('Link not found');
    }
    return result;
  }

  /**
   * Toggle archived status
   */
  async toggleArchived(id, userId) {
    const result = await urlRepository.toggleArchived(id, userId);
    if (!result) {
      throw new NotFoundError('Link not found');
    }
    return result;
  }

  /**
   * Update password
   */
  async updatePassword(id, userId, password) {
    // Verify URL exists
    const url = await urlRepository.findByIdAndUserId(id, userId);
    if (!url) {
      throw new NotFoundError('Link not found');
    }

    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, config.password.saltRounds);
    }

    const result = await urlRepository.updatePassword(id, userId, passwordHash);
    return result;
  }

  /**
   * Update expiration
   */
  async updateExpiration(id, userId, expiresAt) {
    // Verify URL exists
    const url = await urlRepository.findByIdAndUserId(id, userId);
    if (!url) {
      throw new NotFoundError('Link not found');
    }

    const result = await urlRepository.updateExpiration(id, userId, expiresAt);
    return result;
  }

  /**
   * Verify password for protected link
   */
  async verifyPassword(shortCode, password) {
    const url = await urlRepository.findByShortCode(shortCode);
    if (!url) {
      throw new NotFoundError('Link not found');
    }

    if (!url.password_hash) {
      throw new Error('Link is not password protected');
    }

    const isValid = await bcrypt.compare(password, url.password_hash);
    return isValid;
  }

  /**
   * Record click and get stats
   */
  async recordClick(url, clickData) {
    const { ipAddress, userAgent, referrer, deviceType, os, browser } = clickData;

    // Increment click count
    await urlRepository.incrementClicks(url.short_code);

    // Check if unique
    const isUnique = await clickRepository.isUniqueClick(url.id, ipAddress);

    // Record click
    await clickRepository.create({
      urlId: url.id,
      ipAddress,
      deviceType,
      os,
      browser,
      referrer,
      userAgent,
      isUnique,
    });

    return { isUnique, clicks: url.clicks + 1 };
  }

  /**
   * Get URL stats
   */
  async getStats(id, userId, period = 'all') {
    // Verify URL belongs to user
    const url = await urlRepository.findByIdAndUserId(id, userId);
    if (!url) {
      throw new NotFoundError('Link not found');
    }

    // Determine time filter
    let timeFilter = '';
    let daysInterval = 7;

    switch (period) {
      case 'today':
        timeFilter = "AND clicked_at > NOW() - INTERVAL '1 day'";
        daysInterval = 1;
        break;
      case 'week':
        timeFilter = "AND clicked_at > NOW() - INTERVAL '7 days'";
        daysInterval = 7;
        break;
      case 'month':
        timeFilter = "AND clicked_at > NOW() - INTERVAL '30 days'";
        daysInterval = 30;
        break;
      case 'all':
      default:
        timeFilter = '';
        daysInterval = 30;
        break;
    }

    // Get stats
    const stats = await clickRepository.getStats(id, timeFilter);
    const dailyStats = await clickRepository.getDailyStats(id, daysInterval, timeFilter);
    const referrerStats = await clickRepository.getReferrerStats(id, timeFilter);

    return {
      total: stats.total,
      devices: stats.devices,
      os: stats.os,
      browsers: stats.browsers,
      daily: dailyStats,
      referrers: referrerStats,
      period,
    };
  }
}

module.exports = new UrlService();
