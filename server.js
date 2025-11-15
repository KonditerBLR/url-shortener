const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');
const { router: authRoutes, authenticateToken } = require('./auth');
const { pool } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/landing.html');
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Routes
app.use('/api', routes);
app.use('/api/auth', authRoutes);

// Специальные страницы
app.get('/reset-password', (req, res) => {
  res.sendFile(__dirname + '/public/reset-password.html');
});

// Верификация email (обработка из auth.js)
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect('/?message=invalid_token');
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect('/?message=invalid_token');
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.redirect('/?message=already_verified');
    }

    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1',
      [user.id]
    );

    res.redirect('/?message=email_verified');
  } catch (error) {
    console.error(error);
    res.redirect('/?message=error');
  }
});

// Короткие ссылки (должны быть последними)
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});