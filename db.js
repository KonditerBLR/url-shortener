const { Pool } = require('pg');

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection string:', process.env.DATABASE_URL);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    console.log('Server time:', res.rows[0].now);
  }
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export pool for direct access if needed
};
