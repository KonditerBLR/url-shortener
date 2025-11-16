const { Client } = require('pg');
require('dotenv').config();

async function checkDatabase() {
  console.log('\n🔍 Проверка базы данных...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test connection
    console.log('1️⃣ Проверка подключения...');
    await client.connect();
    console.log('   ✓ Подключение успешно');
    console.log(`   Database: ${process.env.DATABASE_URL.split('/').pop().split('?')[0]}`);

    // Check tables
    console.log('\n2️⃣ Проверка таблиц...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    const expectedTables = [
      'users',
      'urls',
      'clicks',
      'password_resets',
      'tags',
      'link_tags',
      'api_keys',
      'webhooks',
      'webhook_logs',
      'migrations'
    ];

    console.log(`   Найдено таблиц: ${tables.length}`);

    const missingTables = expectedTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.log('   ✗ ОТСУТСТВУЮТ таблицы:', missingTables.join(', '));
      console.log('\n   ⚠️  Запустите: npm run migrate');
    } else {
      console.log('   ✓ Все необходимые таблицы созданы');
    }

    // Check urls table columns
    console.log('\n3️⃣ Проверка структуры таблицы urls...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'urls'
      ORDER BY ordinal_position
    `);

    const columns = columnsResult.rows.map(r => r.column_name);
    const requiredColumns = [
      'id',
      'original_url',
      'short_code',
      'user_id',
      'clicks',
      'created_at',
      'is_starred',
      'is_archived',
      'archived_at',
      'description',
      'expires_at',
      'password_hash'
    ];

    const missingColumns = requiredColumns.filter(c => !columns.includes(c));
    if (missingColumns.length > 0) {
      console.log('   ✗ ОТСУТСТВУЮТ колонки:', missingColumns.join(', '));
      console.log('\n   ⚠️  Запустите: npm run migrate');
    } else {
      console.log('   ✓ Все необходимые колонки присутствуют');
      console.log(`   Колонки (${columns.length}):`, columns.join(', '));
    }

    // Check migrations
    console.log('\n4️⃣ Проверка выполненных миграций...');
    try {
      const migrationsResult = await client.query(
        'SELECT filename, executed_at FROM migrations ORDER BY executed_at'
      );

      if (migrationsResult.rows.length === 0) {
        console.log('   ✗ Миграции не выполнены');
        console.log('\n   ⚠️  Запустите: npm run migrate');
      } else {
        console.log(`   ✓ Выполнено миграций: ${migrationsResult.rows.length}`);
        migrationsResult.rows.forEach(row => {
          const date = new Date(row.executed_at).toLocaleString('ru-RU');
          console.log(`     - ${row.filename} (${date})`);
        });
      }
    } catch (err) {
      console.log('   ✗ Таблица migrations не найдена');
      console.log('\n   ⚠️  Запустите: npm run migrate');
    }

    // Check data
    console.log('\n5️⃣ Проверка данных...');
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const urlsCount = await client.query('SELECT COUNT(*) FROM urls');
    const clicksCount = await client.query('SELECT COUNT(*) FROM clicks');

    console.log(`   Пользователей: ${usersCount.rows[0].count}`);
    console.log(`   Ссылок: ${urlsCount.rows[0].count}`);
    console.log(`   Кликов: ${clicksCount.rows[0].count}`);

    console.log('\n✅ Проверка завершена!\n');

    if (missingTables.length > 0 || missingColumns.length > 0) {
      console.log('⚠️  ТРЕБУЕТСЯ ДЕЙСТВИЕ: Запустите npm run migrate\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Ошибка:');
    console.error(error.message);
    console.error('\nПроверьте:');
    console.error('1. PostgreSQL запущен: brew services list');
    console.error('2. База данных существует: psql -l');
    console.error('3. .env файл содержит правильный DATABASE_URL');
    console.error(`   Текущий: ${process.env.DATABASE_URL}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDatabase();
