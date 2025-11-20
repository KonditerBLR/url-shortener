const db = require('../../db');

/**
 * URL Repository - handles all database operations for URLs
 */
class UrlRepository {
  /**
   * Find URL by short code
   */
  async findByShortCode(shortCode) {
    const result = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    return result.rows[0] || null;
  }

  /**
   * Find URL by ID
   */
  async findById(id) {
    const result = await db.query('SELECT * FROM urls WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find URL by ID and user ID
   */
  async findByIdAndUserId(id, userId) {
    const result = await db.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all URLs for a user with tags
   */
  async findByUserId(userId) {
    const result = await db.query(
      `SELECT
        u.id, u.original_url, u.short_code, u.clicks, u.created_at,
        COALESCE(u.is_starred, FALSE) as is_starred,
        COALESCE(u.is_archived, FALSE) as is_archived,
        u.archived_at,
        u.description,
        u.expires_at,
        (u.password_hash IS NOT NULL) as has_password,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
       FROM urls u
       LEFT JOIN link_tags lt ON u.id = lt.url_id
       LEFT JOIN tags t ON lt.tag_id = t.id
       WHERE u.user_id = $1
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Create a new URL
   */
  async create(urlData) {
    const { originalUrl, shortCode, userId, passwordHash, expiresAt } = urlData;
    const result = await db.query(
      'INSERT INTO urls (original_url, short_code, user_id, password_hash, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [originalUrl, shortCode, userId, passwordHash, expiresAt]
    );
    return result.rows[0];
  }

  /**
   * Increment click count
   */
  async incrementClicks(shortCode) {
    await db.query('UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1', [shortCode]);
  }

  /**
   * Delete URL by ID and user ID
   */
  async deleteByIdAndUserId(id, userId) {
    const result = await db.query(
      'DELETE FROM urls WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Toggle starred status
   */
  async toggleStarred(id, userId) {
    const url = await this.findByIdAndUserId(id, userId);
    if (!url) return null;

    const currentStarred = url.is_starred;
    const result = await db.query(
      'UPDATE urls SET is_starred = $1 WHERE id = $2 RETURNING is_starred',
      [!currentStarred, id]
    );
    return result.rows[0];
  }

  /**
   * Update description
   */
  async updateDescription(id, userId, description) {
    const result = await db.query(
      'UPDATE urls SET description = $1 WHERE id = $2 AND user_id = $3 RETURNING description',
      [description || null, id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Toggle archived status
   */
  async toggleArchived(id, userId) {
    const url = await this.findByIdAndUserId(id, userId);
    if (!url) return null;

    const currentArchived = url.is_archived;
    const newArchived = !currentArchived;
    const archivedAt = newArchived ? new Date() : null;

    const result = await db.query(
      'UPDATE urls SET is_archived = $1, archived_at = $2 WHERE id = $3 RETURNING is_archived, archived_at',
      [newArchived, archivedAt, id]
    );
    return result.rows[0];
  }

  /**
   * Update password
   */
  async updatePassword(id, userId, passwordHash) {
    const result = await db.query(
      'UPDATE urls SET password_hash = $1 WHERE id = $2 AND user_id = $3 RETURNING (password_hash IS NOT NULL) as has_password',
      [passwordHash, id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update expiration
   */
  async updateExpiration(id, userId, expiresAt) {
    const result = await db.query(
      'UPDATE urls SET expires_at = $1 WHERE id = $2 AND user_id = $3 RETURNING expires_at',
      [expiresAt || null, id, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UrlRepository();
