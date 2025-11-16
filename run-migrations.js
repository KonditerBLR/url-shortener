const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');
    console.log('  Database:', process.env.DATABASE_URL.split('/').pop().split('?')[0]);

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Migrations table ready');

    // Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Execute in alphabetical order

    console.log(`\nFound ${files.length} migration files\n`);

    let executedCount = 0;
    let skippedCount = 0;

    // Execute each migration
    for (const file of files) {
      // Check if already executed
      const result = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⊘ Skipping ${file} (already executed)`);
        skippedCount++;
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✓ Executed ${file}`);
        executedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to execute ${file}:`);
        console.error(err.message);
        throw err;
      }
    }

    console.log(`\n✓ All migrations completed successfully!`);
    console.log(`  Executed: ${executedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('\n✗ Migration error:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations
runMigrations();
