const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateShortCode } = require('./utils');
const QRCode = require('qrcode');

// Создать короткую ссылку
router.post('/shorten', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Генерируем короткий код
    let shortCode = generateShortCode();
    
    // Проверяем, что код уникальный
    let exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    while (exists.rows.length > 0) {
      shortCode = generateShortCode();
      exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    }

    // Сохраняем в базу
    await db.query(
      'INSERT INTO urls (original_url, short_code) VALUES ($1, $2)',
      [url, shortCode]
    );

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    
    // Генерируем QR-код
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

    // Увеличиваем счётчик кликов
    await db.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1',
      [shortCode]
    );

    // Редирект на оригинальную ссылку
    res.redirect(url.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
