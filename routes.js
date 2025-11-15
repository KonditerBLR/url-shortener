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

// Get user's URLs (для Dashboard) with tags
router.get('/urls/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all user URLs with their tags, starred status, description and archived status
    const result = await db.query(
      `SELECT
        u.id, u.original_url, u.short_code, u.clicks, u.created_at,
        COALESCE(u.is_starred, FALSE) as is_starred,
        COALESCE(u.is_archived, FALSE) as is_archived,
        u.archived_at,
        u.description,
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

    // Статистика по источникам трафика (referrers)
    const referrerStats = await db.query(
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
      [id]
    );

    res.json({
      total: totalStats.rows[0],
      devices: deviceStats.rows,
      os: osStats.rows,
      browsers: browserStats.rows,
      daily: dailyStats.rows,
      referrers: referrerStats.rows,
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

// QR Code endpoint with customization support
router.get('/qr/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { color, bgColor } = req.query;

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${shortCode}`;

    // QR Code options with customization
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: color || '#000000',    // foreground color
        light: bgColor || '#FFFFFF'  // background color
      }
    };

    const qrCode = await QRCode.toDataURL(shortUrl, options);

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

// ===== TAGS API =====

// Get all user tags
router.get('/tags', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      'SELECT id, name, color, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new tag
router.post('/tags', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, color = '#6366f1' } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Tag name must be 50 characters or less' });
    }

    // Check if tag already exists
    const existing = await db.query(
      'SELECT id FROM tags WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    const result = await db.query(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color, created_at',
      [userId, name.trim(), color]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a tag
router.delete('/tags/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add tag to link
router.post('/urls/:urlId/tags/:tagId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { urlId, tagId } = req.params;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
      [urlId, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Verify tag belongs to user
    const tagCheck = await db.query(
      'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
      [tagId, userId]
    );

    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Add tag to link (ignore if already exists)
    await db.query(
      'INSERT INTO link_tags (url_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [urlId, tagId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove tag from link
router.delete('/urls/:urlId/tags/:tagId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { urlId, tagId } = req.params;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
      [urlId, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await db.query(
      'DELETE FROM link_tags WHERE url_id = $1 AND tag_id = $2',
      [urlId, tagId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== STARRED LINKS =====

// Toggle starred status
router.post('/urls/:id/starred', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT is_starred FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Toggle starred
    const currentStarred = urlCheck.rows[0].is_starred;
    const result = await db.query(
      'UPDATE urls SET is_starred = $1 WHERE id = $2 RETURNING is_starred',
      [!currentStarred, id]
    );

    res.json({ is_starred: result.rows[0].is_starred });
  } catch (error) {
    console.error('Error toggling starred:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update link description
router.put('/urls/:id/description', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.user.userId;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Update description
    const result = await db.query(
      'UPDATE urls SET description = $1 WHERE id = $2 RETURNING description',
      [description || null, id]
    );

    res.json({ description: result.rows[0].description });
  } catch (error) {
    console.error('Error updating description:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== ARCHIVED LINKS =====

// Toggle archived status
router.post('/urls/:id/archived', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT is_archived FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Toggle archived
    const currentArchived = urlCheck.rows[0].is_archived;
    const newArchived = !currentArchived;
    const archivedAt = newArchived ? new Date() : null;

    const result = await db.query(
      'UPDATE urls SET is_archived = $1, archived_at = $2 WHERE id = $3 RETURNING is_archived, archived_at',
      [newArchived, archivedAt, id]
    );

    res.json({
      is_archived: result.rows[0].is_archived,
      archived_at: result.rows[0].archived_at
    });
  } catch (error) {
    console.error('Error toggling archived:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;