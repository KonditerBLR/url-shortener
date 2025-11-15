# 🚀 БЫСТРАЯ НАСТРОЙКА ДЛЯ ВАШЕГО MAC

## ✅ У вас уже есть PostgreSQL 14 (работает!)

Вывод показывает:
```
postgresql@14 started  ✓
```

Используйте его, не нужен PostgreSQL 15.

## 📋 ПОШАГОВАЯ ИНСТРУКЦИЯ (5 минут)

### 1. Проверьте что база данных существует

```bash
psql -l | grep url_shortener
```

**Если база НЕ найдена**, создайте её:
```bash
# Подключитесь к PostgreSQL
psql postgres

# В psql выполните (скопируйте всё):
CREATE DATABASE url_shortener;
\q
```

### 2. Убедитесь что .env правильный

Откройте файл `.env` и проверьте:
```env
DATABASE_URL=postgresql://marsatim@localhost:5432/url_shortener
```

**Важно:** Имя пользователя должно быть `marsatim` (ваше имя пользователя Mac)

### 3. Выполните миграции

```bash
npm run migrate
```

**Ожидаемый результат:**
```
✓ Connected to database
  Database: url_shortener
✓ Migrations table ready

Found 9 migration files

✓ Executed 001_init.sql
✓ Executed 002_add_tags.sql
✓ Executed 003_add_starred.sql
✓ Executed 004_add_description.sql
✓ Executed 005_add_archived.sql
✓ Executed 006_add_expiration.sql
✓ Executed 007_add_password_protection.sql
✓ Executed 008_add_api_keys.sql
✓ Executed 009_add_webhooks.sql

✓ All migrations completed successfully!
  Executed: 9
  Skipped: 0
```

### 4. Проверьте базу данных

```bash
npm run check-db
```

Должно показать все таблицы созданы.

### 5. Запустите сервер

```bash
npm start
```

### 6. Откройте браузер

```
http://localhost:3000
```

Зарегистрируйтесь и создайте короткую ссылку.
**Консоль (F12) не должна показывать ошибок 500!**

---

## 🆘 Решение проблем

### Ошибка: "database url_shortener does not exist"

```bash
psql postgres -c "CREATE DATABASE url_shortener;"
npm run migrate
```

### Ошибка: "password authentication failed"

В `.env` укажите точно:
```env
DATABASE_URL=postgresql://marsatim@localhost:5432/url_shortener
```

Без пароля, так как PostgreSQL на Mac по умолчанию использует peer authentication.

### Ошибка: "connect ECONNREFUSED"

PostgreSQL не запущен:
```bash
brew services restart postgresql@14
brew services list | grep postgresql
```

### Проверить что PostgreSQL работает:

```bash
psql postgres -c "SELECT version();"
```

Должна вернуть версию PostgreSQL.

---

## 📞 Что делать если не работает

Пришлите вывод этих команд:

```bash
# 1. Проверка PostgreSQL
brew services list | grep postgresql

# 2. Проверка баз данных
psql -l

# 3. Попытка миграций
npm run migrate

# 4. Проверка базы
npm run check-db
```

---

**Начните с шага 1 и идите по порядку!**
