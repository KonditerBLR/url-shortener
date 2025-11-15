const db = require('./db');
const fs = require('fs');

async function runMigration() {
    try {
        console.log('📦 Running tags migration...');

        const sql = fs.readFileSync('./migrations/add_tags.sql', 'utf8');
        await db.query(sql);

        console.log('✅ Tags migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
