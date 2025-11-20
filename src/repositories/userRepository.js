const db = require('../../db');

/**
 * User Repository - handles all database operations for users
 */
class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token) {
    const result = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);
    return result.rows[0] || null;
  }

  /**
   * Find user by reset token (valid)
   */
  async findByValidResetToken(token) {
    const result = await db.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  async create(userData) {
    const { email, passwordHash, verificationToken } = userData;
    const result = await db.query(
      'INSERT INTO users (email, password_hash, verification_token, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING id, email',
      [email, passwordHash, verificationToken]
    );
    return result.rows[0];
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId) {
    await db.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Set reset token
   */
  async setResetToken(userId, resetToken, resetTokenExpiry) {
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, userId]
    );
  }

  /**
   * Update password
   */
  async updatePassword(userId, passwordHash) {
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }

  /**
   * Clear reset token
   */
  async clearResetToken(userId) {
    await db.query(
      'UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [userId]
    );
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const result = await db.query(
      'SELECT email, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
