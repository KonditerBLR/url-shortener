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
    const { url, customCode, expiresInDays, title } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user?.userId || null;
    let shortCode;
    let isCustom = false;

    // Кастомный код (только для авторизованных)
    if (customCode) {
      if (!userId) {
        return res.status(401).json({ error: 'Custom codes require authentication' });
      }

      // Валидация кастомного кода
      if (!/^[a-zA-Z0-9-_]{3,50}$/.test(customCode)) {
        return res.status(400).json({ error: 'Custom code must be 3-50 characters (letters, numbers, dash, underscore)' });
      }

      // Проверка что код свободен
      const exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [customCode]);
      if (exists.rows.length > 0) {
        return res.status(400).json({ error: 'This custom code is already taken' });
      }

      shortCode = customCode;
      isCustom = true;
    } else {
      // Генерация случайного кода
      shortCode = generateShortCode();
      let exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      while (exists.rows.length > 0) {
        shortCode = generateShortCode();
        exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      }
    }

    // Срок действия (если указан)
    let expiresAt = null;
    if (expiresInDays && userId) {
      const days = parseInt(expiresInDays);
      if (days > 0 && days <= 365) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
    }

    await db.query(
      'INSERT INTO urls (original_url, short_code, user_id, is_custom, expires_at, title) VALUES ($1, $2, $3, $4, $5, $6)',
      [url, shortCode, userId, isCustom, expiresAt, title || null]
    );

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    res.json({
      success: true,
      originalUrl: url,
      shortUrl,
      shortCode,
      qrCode,
      expiresAt,
      title
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
      'SELECT id, original_url, short_code, clicks, title, is_custom, expires_at, created_at, updated_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user URLs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get aggregated statistics for user's dashboard
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all user's URLs
    const urlsResult = await db.query(
      'SELECT id FROM urls WHERE user_id = $1',
      [userId]
    );

    if (urlsResult.rows.length === 0) {
      return res.json({
        totalClicksToday: 0,
        totalClicksMonth: 0
      });
    }

    const urlIds = urlsResult.rows.map(row => row.id);

    // Get aggregated click statistics
    const statsResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '1 day') as clicks_today,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_month
       FROM clicks
       WHERE url_id = ANY($1)`,
      [urlIds]
    );

    res.json({
      totalClicksToday: parseInt(statsResult.rows[0].clicks_today) || 0,
      totalClicksMonth: parseInt(statsResult.rows[0].clicks_month) || 0
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить статистику по ссылке
router.get('/urls/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Проверяем что ссылка принадлежит пользователю
    const urlCheck = await db.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Общая статистика
    const totalStats = await db.query(
      `SELECT 
        COUNT(*) as total_clicks,
        COUNT(*) FILTER (WHERE is_unique = TRUE) as unique_clicks,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '1 day') as clicks_today,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '7 days') as clicks_week,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_month
       FROM clicks WHERE url_id = $1`,
      [id]
    );

    // Статистика по устройствам
    const deviceStats = await db.query(
      `SELECT device_type, COUNT(*) as count 
       FROM clicks WHERE url_id = $1 
       GROUP BY device_type`,
      [id]
    );

    // Статистика по ОС
    const osStats = await db.query(
      `SELECT os, COUNT(*) as count 
       FROM clicks WHERE url_id = $1 
       GROUP BY os 
       ORDER BY count DESC`,
      [id]
    );

    // Статистика по браузерам
    const browserStats = await db.query(
      `SELECT browser, COUNT(*) as count 
       FROM clicks WHERE url_id = $1 
       GROUP BY browser 
       ORDER BY count DESC`,
      [id]
    );

    // Клики по дням (последние 7 дней)
    const dailyStats = await db.query(
      `SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks
       FROM clicks 
       WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(clicked_at)
       ORDER BY date DESC`,
      [id]
    );

    res.json({
      total: totalStats.rows[0],
      devices: deviceStats.rows,
      os: osStats.rows,
      browsers: browserStats.rows,
      daily: dailyStats.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update URL
router.put('/urls/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { original_url, title, expiresInDays } = req.body;

    // Проверка что ссылка принадлежит пользователю
    const urlCheck = await db.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Обновление срока действия
    let expiresAt = urlCheck.rows[0].expires_at;
    if (expiresInDays !== undefined) {
      if (expiresInDays === null || expiresInDays === 0) {
        expiresAt = null;
      } else {
        const days = parseInt(expiresInDays);
        if (days > 0 && days <= 365) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }
    }

    const result = await db.query(
      'UPDATE urls SET original_url = COALESCE($1, original_url), title = COALESCE($2, title), expires_at = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
      [original_url, title, expiresAt, id, userId]
    );

    res.json({ success: true, url: result.rows[0] });
  } catch (error) {
    console.error('Error updating URL:', error);
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

// Export statistics as CSV
router.get('/urls/:id/export', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Проверка что ссылка принадлежит пользователю
    const urlCheck = await db.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Получаем все клики
    const clicks = await db.query(
      `SELECT
        clicked_at,
        ip_address,
        device_type,
        os,
        browser,
        country,
        city,
        referrer,
        is_unique
       FROM clicks
       WHERE url_id = $1
       ORDER BY clicked_at DESC`,
      [id]
    );

    // Формируем CSV
    const csvHeaders = 'Date,Time,IP,Device,OS,Browser,Country,City,Referrer,Unique\n';
    const csvRows = clicks.rows.map(click => {
      const date = new Date(click.clicked_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        click.ip_address || '',
        click.device_type || '',
        click.os || '',
        click.browser || '',
        click.country || '',
        click.city || '',
        click.referrer || '',
        click.is_unique ? 'Yes' : 'No'
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    const csv = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="link-${urlCheck.rows[0].short_code}-stats.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting stats:', error);
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

    // Проверка срока действия
    if (url.expires_at) {
      const now = new Date();
      const expiresAt = new Date(url.expires_at);
      if (now > expiresAt) {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Link Expired</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }
                h1 { color: #333; margin: 0 0 20px 0; }
                p { color: #666; font-size: 18px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⏰ Link Expired</h1>
                <p>This short link has expired and is no longer available.</p>
                <p style="font-size: 14px; color: #999;">Expired on: ${expiresAt.toLocaleDateString()}</p>
              </div>
            </body>
          </html>
        `);
      }
    }

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