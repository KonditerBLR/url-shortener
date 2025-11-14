const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');
const { router: authRoutes } = require('./auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
  const db = require('./db');

  if (!token) {
    return res.redirect('/?message=invalid_token');
  }

  try {
    const result = await db.query(
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

    await db.query(
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
