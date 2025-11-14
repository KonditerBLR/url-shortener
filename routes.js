const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateShortCode } = require('./utils');
const { authenticateToken } = require('./auth');
const QRCode = require('qrcode');

// Получить все ссылки (только свои, если авторизован)
router.get('/links', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Токен невалидный, показываем все ссылки без user_id
      }
    }
    
    let result;
    if (userId) {
      result = await db.query(
        'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
    } else {
      result = await db.query(
        'SELECT * FROM urls WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50'
      );
    }
    
    res.json({ success: true, links: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать короткую ссылку
router.post('/shorten', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Проверяем авторизацию
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Токен невалидный, создаём без user_id
      }
    }

    let shortCode = generateShortCode();
    
    let exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    while (exists.rows.length > 0) {
      shortCode = generateShortCode();
      exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    }

    await db.query(
      'INSERT INTO urls (original_url, short_code, user_id) VALUES ($1, $2, $3)',
      [url, shortCode, userId]
    );

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    res.json({
      success: true,
      originalUrl: url,
      shortUrl,
      shortCode,
      qrCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить ссылку (только свою)
router.delete('/links/:shortCode', authenticateToken, async (req, res) => {
  try {
    const { shortCode } = req.params;
    const userId = req.user.userId;
    
    const result = await db.query(
      'DELETE FROM urls WHERE short_code = $1 AND user_id = $2 RETURNING *',
      [shortCode, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }
    
    res.json({ success: true, message: 'Ссылка удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Редирект по короткому коду
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const result = await db.query(
      'SELECT * FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const url = result.rows[0];

    await db.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1',
      [shortCode]
    );

    res.redirect(url.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;