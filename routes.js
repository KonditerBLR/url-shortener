const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateShortCode } = require('./utils');
const { authenticateToken } = require('./auth');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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

    // Fire webhook for link.created event (asynchronously)
    if (userId) {
      fireWebhook(userId, 'link.created', {
        short_code: shortCode,
        original_url: url,
        short_url: shortUrl
      }).catch(err => console.error('Webhook error:', err));
    }

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

    // Get all user URLs with their tags, starred status, description, archived, expiration, and password protection
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

    // Check if link is expired
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
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #ef4444; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>⏰ Link Expired</h1>
            <p>This short link has expired and is no longer available.</p>
            <p>Expired on: ${expiresAt.toLocaleDateString()}</p>
          </body>
          </html>
        `);
      }
    }

    // Check if link is password protected
    if (url.password_hash) {
      // Check for verification cookie
      const verificationToken = req.cookies?.[`pwd_${shortCode}`];
      let isVerified = false;

      if (verificationToken) {
        try {
          const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
          isVerified = decoded.shortCode === shortCode;
        } catch (err) {
          // Invalid token, will show password prompt
        }
      }

      if (!isVerified) {
        // Show password prompt page
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Password Protected Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              }
              h1 {
                color: #333;
                margin-bottom: 10px;
                font-size: 24px;
              }
              p {
                color: #666;
                margin-bottom: 30px;
                font-size: 14px;
              }
              .form-group {
                margin-bottom: 20px;
              }
              label {
                display: block;
                color: #333;
                margin-bottom: 8px;
                font-weight: 500;
                font-size: 14px;
              }
              input[type="password"] {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s;
              }
              input[type="password"]:focus {
                outline: none;
                border-color: #667eea;
              }
              button {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
              }
              button:hover {
                transform: translateY(-2px);
              }
              button:active {
                transform: translateY(0);
              }
              .error {
                background: #fee;
                border: 1px solid #fcc;
                color: #c33;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 14px;
                display: none;
              }
              .lock-icon {
                width: 60px;
                height: 60px;
                margin: 0 auto 20px;
                color: #667eea;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <svg class="lock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-width="2"/>
              </svg>
              <h1>🔒 Password Required</h1>
              <p>This link is password protected. Please enter the password to continue.</p>
              <div id="errorMsg" class="error"></div>
              <form id="passwordForm">
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" id="password" name="password" required autofocus>
                </div>
                <button type="submit">Unlock Link</button>
              </form>
            </div>
            <script>
              document.getElementById('passwordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('password').value;
                const errorMsg = document.getElementById('errorMsg');

                try {
                  const response = await fetch('/api/verify-password/${shortCode}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                  });

                  const data = await response.json();

                  if (response.ok) {
                    // Redirect to the short link again, cookie will be set
                    window.location.href = '/${shortCode}';
                  } else {
                    errorMsg.textContent = data.error || 'Incorrect password';
                    errorMsg.style.display = 'block';
                  }
                } catch (error) {
                  errorMsg.textContent = 'An error occurred. Please try again.';
                  errorMsg.style.display = 'block';
                }
              });
            </script>
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

    // Fire webhooks (asynchronously, don't block redirect)
    if (url.user_id) {
      fireWebhook(url.user_id, 'link.clicked', {
        short_code: shortCode,
        original_url: url.original_url,
        clicks: url.clicks + 1,
        device_type: deviceType,
        os: os,
        browser: browser,
        referrer: referrer,
        is_unique: isUnique
      }).catch(err => console.error('Webhook error:', err));
    }

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

// ===== PASSWORD PROTECTION =====

// Verify password for protected link
router.post('/verify-password/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get link with password hash
    const result = await db.query(
      'SELECT id, password_hash FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const url = result.rows[0];

    if (!url.password_hash) {
      return res.status(400).json({ error: 'Link is not password protected' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, url.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Create verification token (valid for 24 hours)
    const token = jwt.sign(
      { shortCode },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie(`pwd_${shortCode}`, token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set or update link password
router.put('/urls/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.user.userId;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    let passwordHash = null;

    // If password provided, hash it
    if (password && password.trim() !== '') {
      // Validate password length
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Update password
    const result = await db.query(
      'UPDATE urls SET password_hash = $1 WHERE id = $2 RETURNING (password_hash IS NOT NULL) as has_password',
      [passwordHash, id]
    );

    res.json({
      has_password: result.rows[0].has_password
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== LINK EXPIRATION =====

// Set or update link expiration
router.put('/urls/:id/expiration', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { expires_at } = req.body;
    const userId = req.user.userId;

    // Verify url belongs to user
    const urlCheck = await db.query(
      'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Validate expiration date if provided
    if (expires_at !== null && expires_at !== undefined) {
      const expirationDate = new Date(expires_at);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date' });
      }
      // Check if date is in the future
      if (expirationDate <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be in the future' });
      }
    }

    // Update expiration
    const result = await db.query(
      'UPDATE urls SET expires_at = $1 WHERE id = $2 RETURNING expires_at',
      [expires_at || null, id]
    );

    res.json({
      expires_at: result.rows[0].expires_at
    });
  } catch (error) {
    console.error('Error updating expiration:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== API KEY MANAGEMENT =====

// Middleware to authenticate API key requests
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // API keys are in format: sk_<random_string>
    if (!apiKey.startsWith('sk_')) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    // Hash the API key for lookup
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find and verify API key
    const result = await db.query(
      `SELECT ak.*, u.id as user_id, u.email
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.is_active = TRUE`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    const apiKeyData = result.rows[0];

    // Check expiration
    if (apiKeyData.expires_at) {
      const now = new Date();
      const expiresAt = new Date(apiKeyData.expires_at);
      if (now > expiresAt) {
        return res.status(401).json({ error: 'API key has expired' });
      }
    }

    // Update last used timestamp (async, don't wait)
    db.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyData.id]
    ).catch(err => console.error('Error updating API key last_used_at:', err));

    // Attach user info to request
    req.user = {
      userId: apiKeyData.user_id,
      email: apiKeyData.email
    };

    next();
  } catch (error) {
    console.error('Error authenticating API key:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Generate new API key
router.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    const { name, expiresInDays } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'API key name is required' });
    }

    // Check if user already has 10 or more active keys
    const countResult = await db.query(
      'SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({ error: 'Maximum of 10 active API keys allowed' });
    }

    // Generate random API key
    const randomBytes = crypto.randomBytes(32);
    const apiKey = `sk_${randomBytes.toString('base64url')}`;
    const keyPrefix = apiKey.substring(0, 10);

    // Hash the API key for storage
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Store API key
    const result = await db.query(
      `INSERT INTO api_keys (user_id, key_name, key_hash, key_prefix, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, key_name, key_prefix, created_at, expires_at, is_active`,
      [userId, name.trim(), keyHash, keyPrefix, expiresAt]
    );

    res.json({
      apiKey: apiKey, // Only shown once!
      ...result.rows[0],
      message: 'Save this API key securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List user's API keys
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, key_name, key_prefix, created_at, last_used_at, expires_at, is_active
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke/delete API key
router.delete('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify API key belongs to user
    const checkResult = await db.query(
      'SELECT id FROM api_keys WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Delete API key
    await db.query('DELETE FROM api_keys WHERE id = $1', [id]);

    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to create short URL using API key
router.post('/shorten', authenticateApiKey, async (req, res) => {
  try {
    const { url, customCode, password, expiresInDays } = req.body;
    const userId = req.user.userId;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    let shortCode;

    // Check if custom code is provided
    if (customCode) {
      // Validate custom code (alphanumeric, 3-20 chars)
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(customCode)) {
        return res.status(400).json({
          error: 'Custom code must be 3-20 characters (alphanumeric, dash, underscore)'
        });
      }

      // Check if custom code is already taken
      const existing = await db.query(
        'SELECT id FROM urls WHERE short_code = $1',
        [customCode]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Custom code already taken' });
      }

      shortCode = customCode;
    } else {
      // Generate random short code
      shortCode = generateShortCode();

      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.query(
          'SELECT id FROM urls WHERE short_code = $1',
          [shortCode]
        );

        if (existing.rows.length === 0) break;

        shortCode = generateShortCode();
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({ error: 'Failed to generate unique code' });
      }
    }

    // Handle password protection
    let passwordHash = null;
    if (password && password.trim() !== '') {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Handle expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Insert URL
    const result = await db.query(
      `INSERT INTO urls (original_url, short_code, user_id, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, original_url, short_code, created_at, expires_at, (password_hash IS NOT NULL) as has_password`,
      [url, shortCode, userId, passwordHash, expiresAt]
    );

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;

    // Fire webhook for link.created event (asynchronously)
    fireWebhook(userId, 'link.created', {
      short_code: shortCode,
      original_url: url,
      short_url: shortUrl,
      has_password: !!passwordHash,
      expires_at: expiresAt
    }).catch(err => console.error('Webhook error:', err));

    res.status(201).json({
      ...result.rows[0],
      short_url: shortUrl
    });
  } catch (error) {
    console.error('Error creating short URL via API:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== WEBHOOKS =====

// Helper function to fire webhooks
async function fireWebhook(userId, eventType, payload) {
  try {
    const webhooks = await db.query(
      `SELECT * FROM webhooks
       WHERE user_id = $1 AND is_active = TRUE AND $2 = ANY(events)`,
      [userId, eventType]
    );

    for (const webhook of webhooks.rows) {
      // Fire webhook asynchronously (don't wait)
      sendWebhookRequest(webhook, eventType, payload).catch(err =>
        console.error('Webhook delivery error:', err)
      );
    }
  } catch (error) {
    console.error('Error firing webhooks:', error);
  }
}

async function sendWebhookRequest(webhook, eventType, payload) {
  const webhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  };

  let signature = null;
  if (webhook.secret_key) {
    const hmac = crypto.createHmac('sha256', webhook.secret_key);
    hmac.update(JSON.stringify(webhookPayload));
    signature = hmac.digest('hex');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(webhook.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'URLShortener-Webhook/1.0',
        ...(signature && { 'X-Webhook-Signature': signature })
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const responseBody = await response.text();

    // Log webhook delivery
    await db.query(
      `INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body, success)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        webhook.id,
        eventType,
        JSON.stringify(webhookPayload),
        response.status,
        responseBody.substring(0, 1000), // Limit response body size
        response.ok
      ]
    );

    // Update last_triggered_at
    await db.query(
      'UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = $1',
      [webhook.id]
    );
  } catch (error) {
    // Log failed delivery
    await db.query(
      `INSERT INTO webhook_logs (webhook_id, event_type, payload, error_message, success)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [webhook.id, eventType, JSON.stringify(webhookPayload), error.message]
    );
  }
}

// Create webhook
router.post('/webhooks', authenticateToken, async (req, res) => {
  try {
    const { name, url, secret, events } = req.body;
    const userId = req.user.userId;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check webhook limit (max 5 per user)
    const countResult = await db.query(
      'SELECT COUNT(*) FROM webhooks WHERE user_id = $1',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 webhooks allowed' });
    }

    // Validate events
    const validEvents = ['link.clicked', 'link.created'];
    const webhookEvents = events && events.length > 0 ? events : ['link.clicked'];

    for (const event of webhookEvents) {
      if (!validEvents.includes(event)) {
        return res.status(400).json({
          error: `Invalid event type: ${event}. Valid events: ${validEvents.join(', ')}`
        });
      }
    }

    // Generate secret key if not provided
    const secretKey = secret || crypto.randomBytes(32).toString('hex');

    const result = await db.query(
      `INSERT INTO webhooks (user_id, webhook_name, endpoint_url, secret_key, events)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, webhook_name, endpoint_url, secret_key, events, is_active, created_at`,
      [userId, name.trim(), url, secretKey, webhookEvents]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List webhooks
router.get('/webhooks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, webhook_name, endpoint_url, events, is_active, last_triggered_at, created_at
       FROM webhooks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete webhook
router.delete('/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const checkResult = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await db.query('DELETE FROM webhooks WHERE id = $1', [id]);

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle webhook active status
router.patch('/webhooks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query(
      `UPDATE webhooks
       SET is_active = NOT is_active
       WHERE id = $1 AND user_id = $2
       RETURNING is_active`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ is_active: result.rows[0].is_active });
  } catch (error) {
    console.error('Error toggling webhook:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get webhook logs
router.get('/webhooks/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify webhook belongs to user
    const webhookCheck = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const result = await db.query(
      `SELECT id, event_type, response_status, error_message, delivered_at, success
       FROM webhook_logs
       WHERE webhook_id = $1
       ORDER BY delivered_at DESC
       LIMIT 50`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Attach fireWebhook to router for external use
router.fireWebhook = fireWebhook;

module.exports = router;