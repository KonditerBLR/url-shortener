const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../../email');
const {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');
const config = require('../config');

/**
 * Auth Service - contains business logic for authentication
 */
class AuthService {
  /**
   * Register a new user
   */
  async register(email, password) {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.password.saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await userRepository.create({
      email,
      passwordHash,
      verificationToken,
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    return {
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      needsVerification: true,
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if email is verified
    if (!user.email_verified) {
      throw new AuthenticationError('Please verify your email. Check your inbox.');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      success: true,
      token,
      user: { id: user.id, email: user.email },
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    // Find user with token
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new ValidationError('Invalid verification token');
    }

    // Check if already verified
    if (user.email_verified) {
      return { success: true, message: 'Email already verified' };
    }

    // Verify email
    await userRepository.verifyEmail(user.id);

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    // Find user
    const user = await userRepository.findByEmail(email);

    // Don't reveal if user exists (security)
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a reset link will be sent',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + config.email.resetTokenExpiry);

    // Save reset token
    await userRepository.setResetToken(user.id, resetToken, resetTokenExpiry);

    // Send email
    await sendPasswordResetEmail(email, resetToken);

    return {
      success: true,
      message: 'Password reset instructions sent to your email',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token, password) {
    // Find user with valid reset token
    const user = await userRepository.findByValidResetToken(token);
    if (!user) {
      throw new ValidationError('Invalid or expired token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, config.password.saltRounds);

    // Update password
    await userRepository.updatePassword(user.id, passwordHash);

    // Clear reset token
    await userRepository.clearResetToken(user.id);

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Change password (for logged-in users)
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.password.saltRounds);

    // Update password
    await userRepository.updatePassword(userId, passwordHash);

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const profile = await userRepository.getProfile(userId);
    if (!profile) {
      throw new NotFoundError('User not found');
    }
    return profile;
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }
}

module.exports = new AuthService();
