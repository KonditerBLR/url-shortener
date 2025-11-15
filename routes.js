const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateShortCode } = require('./utils');
const { authenticateToken } = require('./auth');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

// Optional auth middleware
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Получить все ссылки (только свои, если авторизован)
router.get('/links', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Токен невалидный
      }
    }

    let result;
    if (userId) {
      result = await db.query(
        'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
    } else {
      result = { rows: [] };
    }

    res.json({ success: true, links: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать короткую ссылку
router.post('/shorten', optionalAuth, async (req, res) => {
  try {
    const { url, customCode } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user?.userId || null;
    let shortCode;

    // Use custom code if provided
    if (customCode) {
      // Validate custom code
      if (!/^[a-zA-Z0-9-_]+$/.test(customCode)) {
        return res.status(400).json({ error: 'Custom code can only contain letters, numbers, hyphens and underscores' });
      }
      if (customCode.length < 3 || customCode.length > 50) {
        return res.status(400).json({ error: 'Custom code must be between 3 and 50 characters' });
      }

      // Check if custom code already exists
      const exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [customCode]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'This custom code is already taken. Please choose another one.' });
      }

      shortCode = customCode;
    } else {
      // Generate random code
      shortCode = generateShortCode();

      let exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      while (exists.rows.length > 0) {
        shortCode = generateShortCode();
        exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      }
    }

    await db.query(
      'INSERT INTO urls (original_url, short_code, user_id) VALUES ($1, $2, $3)',
      [url, shortCode, userId]
    );

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${shortCode}`;
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

// Get user's URLs (для Dashboard)
router.get('/urls/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await db.query(
      'SELECT id, original_url, short_code, clicks, created_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user URLs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить статистику по ссылке
router.get('/urls/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'all' } = req.query; // today, week, month, all
    const userId = req.user.userId;

    // Проверяем что ссылка принадлежит пользователю
    const urlCheck = await db.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Определяем фильтр по времени
    let timeFilter = '';
    let daysInterval = 7;

    switch(period) {
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

    // Общая статистика
    const totalStats = await db.query(
      `SELECT
        COUNT(*) as total_clicks,
        COUNT(*) FILTER (WHERE is_unique = TRUE) as unique_clicks,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '1 day') as clicks_today,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '7 days') as clicks_week,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_month
       FROM clicks WHERE url_id = $1 ${timeFilter}`,
      [id]
    );

    // Статистика по устройствам
    const deviceStats = await db.query(
      `SELECT device_type, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY device_type`,
      [id]
    );

    // Статистика по ОС
    const osStats = await db.query(
      `SELECT os, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY os
       ORDER BY count DESC`,
      [id]
    );

    // Статистика по браузерам
    const browserStats = await db.query(
      `SELECT browser, COUNT(*) as count
       FROM clicks WHERE url_id = $1 ${timeFilter}
       GROUP BY browser
       ORDER BY count DESC`,
      [id]
    );

    // Клики по дням (по выбранному периоду)
    const dailyStats = await db.query(
      `SELECT
        DATE(clicked_at) as date,
        COUNT(*) as clicks
       FROM clicks
       WHERE url_id = $1 ${timeFilter}
       GROUP BY DATE(clicked_at)
       ORDER BY date DESC
       LIMIT ${daysInterval}`,
      [id]
    );

    res.json({
      total: totalStats.rows[0],
      devices: deviceStats.rows,
      os: osStats.rows,
      browsers: browserStats.rows,
      daily: dailyStats.rows,
      period: period
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete URL by ID
router.delete('/urls/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const result = await db.query(
      'DELETE FROM urls WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// QR Code endpoint
router.get('/qr/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);
    
    res.send(`<img src="${qrCode}" alt="QR Code" />`);
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

    // Увеличиваем общий счётчик кликов
    await db.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1',
      [shortCode]
    );

    // Собираем данные о клике
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    // Определяем тип устройства
    let deviceType = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
    if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';

    // Определяем ОС
    let os = 'Unknown';
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac OS/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

    // Определяем браузер
    let browser = 'Unknown';
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Chrome';
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Edg/i.test(userAgent)) browser = 'Edge';

    // Проверяем уникальность (по IP за последние 24 часа)
    const uniqueCheck = await db.query(
      'SELECT COUNT(*) FROM clicks WHERE url_id = $1 AND ip_address = $2 AND clicked_at > NOW() - INTERVAL \'24 hours\'',
      [url.id, ip]
    );
    const isUnique = parseInt(uniqueCheck.rows[0].count) === 0;

    // Сохраняем клик в базу
    await db.query(
      `INSERT INTO clicks (url_id, ip_address, device_type, os, browser, referrer, user_agent, is_unique)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [url.id, ip, deviceType, os, browser, referrer, userAgent, isUnique]
    );

    // Редиректим на оригинальный URL
    res.redirect(url.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;