const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { router: authRoutes, authenticateToken } = require('./auth');
const { pool } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
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

// Change password
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
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

// 404 Handler - must be after all routes
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Page Not Found</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          padding: 20px;
        }
        .container {
          max-width: 600px;
        }
        h1 {
          font-size: 120px;
          font-weight: 700;
          margin-bottom: 20px;
          text-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h2 {
          font-size: 32px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        p {
          font-size: 18px;
          margin-bottom: 40px;
          opacity: 0.9;
        }
        a {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 16px 40px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          font-size: 18px;
          transition: transform 0.3s, box-shadow 0.3s;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        a:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/">Go Back Home</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});