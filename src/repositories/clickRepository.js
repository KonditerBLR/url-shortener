const db = require('../../db');

/**
 * Click Repository - handles all database operations for clicks
 */
class ClickRepository {
  /**
   * Create a new click record
   */
  async create(clickData) {
    const { urlId, ipAddress, deviceType, os, browser, referrer, userAgent, isUnique } =
      clickData;

    await db.query(
      `INSERT INTO clicks (url_id, ip_address, device_type, os, browser, referrer, user_agent, is_unique)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [urlId, ipAddress, deviceType, os, browser, referrer, userAgent, isUnique]
    );
  }

  /**
   * Check if IP has clicked in last 24 hours (for uniqueness)
   */
  async isUniqueClick(urlId, ipAddress) {
    const result = await db.query(
      'SELECT COUNT(*) FROM clicks WHERE url_id = $1 AND ip_address = $2 AND clicked_at > NOW() - INTERVAL \'24 hours\'',
      [urlId, ipAddress]
    );
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Get stats for a URL
   */
  async getStats(urlId, timeFilter = '') {
    const totalStats = await db.query(
      `SELECT
        COUNT(*) as total_clicks,
        COUNT(*) FILTER (WHERE is_unique = TRUE) as unique_clicks,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '1 day') as clicks_today,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '7 days') as clicks_week,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_month
       FROM clicks WHERE url_id = $1 ${timeFilter}`,
      [urlId]
    );

    const deviceStats = await db.query(
      `SELECT device_type, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY device_type`,
      [urlId]
    );

    const osStats = await db.query(
      `SELECT os, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY os
       ORDER BY count DESC`,
      [urlId]
    );

    const browserStats = await db.query(
      `SELECT browser, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY browser
       ORDER BY count DESC`,
      [urlId]
    );

    return {
      total: totalStats.rows[0],
      devices: deviceStats.rows,
      os: osStats.rows,
      browsers: browserStats.rows,
    };
  }

  /**
   * Get daily stats
   */
  async getDailyStats(urlId, daysInterval, timeFilter = '') {
    const result = await db.query(
      `SELECT
        DATE(clicked_at) as date,
        COUNT(*) as clicks
       FROM clicks
       WHERE url_id = $1 ${timeFilter}
       GROUP BY DATE(clicked_at)
       ORDER BY date DESC
       LIMIT ${daysInterval}`,
      [urlId]
    );
    return result.rows;
  }

  /**
   * Get referrer stats
   */
  async getReferrerStats(urlId, timeFilter = '') {
    const result = await db.query(
      `SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google.%' THEN 'Google'
          WHEN referrer LIKE '%facebook.%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter.%' OR referrer LIKE '%t.co%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin.%' THEN 'LinkedIn'
          WHEN referrer LIKE '%instagram.%' THEN 'Instagram'
          WHEN referrer LIKE '%youtube.%' THEN 'YouTube'
          WHEN referrer LIKE '%reddit.%' THEN 'Reddit'
          WHEN referrer LIKE '%github.%' THEN 'GitHub'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
       FROM clicks
       WHERE url_id = $1 ${timeFilter}
       GROUP BY source
       ORDER BY count DESC
       LIMIT 10`,
      [urlId]
    );
    return result.rows;
  }
}

module.exports = new ClickRepository();
