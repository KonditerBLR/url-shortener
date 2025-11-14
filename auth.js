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
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 8 символов' });
        }

        // Проверяем, существует ли пользователь
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
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
            message: 'Регистрация успешна! Проверьте вашу почту для подтверждения email.',
            needsVerification: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Логин
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        // Ищем пользователя
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        const user = result.rows[0];

        // Проверяем пароль
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        // Проверяем, подтверждён ли email
        if (!user.email_verified) {
            return res.status(400).json({ error: 'Пожалуйста, подтвердите ваш email. Проверьте почту.' });
        }

        // Создаём JWT токен
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({ success: true, token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
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
            return res.status(400).json({ error: 'Email обязателен' });
        }

        // Проверяем, существует ли пользователь
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // Не говорим пользователю, что email не найден (безопасность)
            return res.json({ success: true, message: 'Если email существует, письмо будет отправлено' });
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

        res.json({ success: true, message: 'Письмо с инструкциями отправлено на ваш email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Сброс пароля
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Токен и пароль обязательны' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 8 символов' });
        }

        // Ищем пользователя с валидным токеном
        const result = await db.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Недействительный или истёкший токен' });
        }

        const user = result.rows[0];

        // Хешируем новый пароль
        const passwordHash = await bcrypt.hash(password, 10);

        // Обновляем пароль и удаляем токен
        await db.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        res.json({ success: true, message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Подтверждение email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Токен не указан' });
        }

        // Ищем пользователя с этим токеном
        const result = await db.query(
            'SELECT * FROM users WHERE verification_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Недействительный токен' });
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
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = { router, authenticateToken };