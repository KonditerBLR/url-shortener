const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { sendPasswordResetEmail, sendVerificationEmail } = require('./email');
const crypto = require('crypto');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Проверяем, существует ли пользователь
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Хешируем пароль
        const passwordHash = await bcrypt.hash(password, 10);

        // Генерируем токен верификации
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Создаём пользователя
        const result = await db.query(
            'INSERT INTO users (email, password_hash, verification_token, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING id, email',
            [email, passwordHash, verificationToken]
        );

        const user = result.rows[0];

        // Отправляем письмо верификации
        await sendVerificationEmail(email, verificationToken);

        // Не создаём токен - пользователь должен сначала подтвердить email
        res.json({
            success: true,
            message: 'Registration successful! Check your email to verify your account.',
            needsVerification: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Логин
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Ищем пользователя
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Проверяем пароль
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Создаём JWT токен
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
        const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '30d' });

        res.json({ success: true, token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token not provided' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Запрос на восстановление пароля
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Проверяем, существует ли пользователь
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // Не говорим пользователю, что email не найден (безопасность)
            return res.json({ success: true, message: 'If the email exists, a password reset link will be sent' });
        }

        const user = result.rows[0];

        // Генерируем токен для сброса
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 час

        // Сохраняем токен в базу
        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
            [resetToken, resetTokenExpiry, user.id]
        );

        // Отправляем email
        await sendPasswordResetEmail(email, resetToken);

        res.json({ success: true, message: 'Password reset instructions sent to your email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Сброс пароля
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Ищем пользователя с валидным токеном
        const result = await db.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const user = result.rows[0];

        // Хешируем новый пароль
        const passwordHash = await bcrypt.hash(password, 10);

        // Обновляем пароль и удаляем токен
        await db.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        res.json({ success: true, message: 'Password successfully changed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Подтверждение email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token not provided' });
        }

        // Ищем пользователя с этим токеном
        const result = await db.query(
            'SELECT * FROM users WHERE verification_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        const user = result.rows[0];

        // Если уже подтверждён
        if (user.email_verified) {
            return res.redirect('/?message=already_verified');
        }

        // Подтверждаем email
        await db.query(
            'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1',
            [user.id]
        );

        // Перенаправляем на главную с сообщением
        res.redirect('/?message=email_verified');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Смена пароля (для авторизованных пользователей)
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Получаем пользователя
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Проверяем текущий пароль
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Хешируем новый пароль
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, userId]
        );

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = { router, authenticateToken };