# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ ОШИБОК 500

## Проблема
Ошибки 500 на:
- `api/urls/user`
- `api/shorten`

**Причина:** Базовые таблицы БД не созданы (отсутствовала миграция init.sql)

## ✅ РЕШЕНИЕ (5 минут)

### Шаг 1: Обновите код
```bash
cd /path/to/url-shortener
git pull origin claude/project-analysis-postgres-fix-01JECrhyCwsaekWcWfPdd297
```

### Шаг 2: Убедитесь что PostgreSQL запущен
```bash
# Проверьте статус
brew services list | grep postgresql

# Если не запущен, запустите:
brew services start postgresql@15
```

### Шаг 3: Выполните миграции
```bash
npm run migrate
```

**Вы должны увидеть:**
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

### Шаг 4: Перезапустите сервер
```bash
# Остановите сервер (Ctrl+C если запущен)
# Затем запустите:
npm start
```

### Шаг 5: Проверьте что работает
1. Откройте `http://localhost:3000`
2. Войдите или зарегистрируйтесь
3. Попробуйте создать короткую ссылку
4. Откройте консоль браузера (F12) - **НЕ должно быть ошибок 500**

## 🔍 Что было исправлено

### Создан файл `001_init.sql`
Базовая миграция с таблицами:
- **users** - пользователи
- **urls** - короткие ссылки
- **clicks** - статистика кликов
- **password_resets** - восстановление пароля

### Переименованы миграции
Для правильного порядка выполнения:
```
001_init.sql                    (NEW!)
002_add_tags.sql
003_add_starred.sql
004_add_description.sql
005_add_archived.sql
006_add_expiration.sql
007_add_password_protection.sql
008_add_api_keys.sql
009_add_webhooks.sql
```

## 🆘 Если ошибка "Database url_shortener does not exist"

Создайте базу данных:
```bash
# Подключитесь к PostgreSQL
psql postgres

# В psql выполните:
CREATE DATABASE url_shortener;
\q

# Теперь запустите миграции
npm run migrate
```

## 🆘 Если ошибка "Password authentication failed"

В `.env` файле DATABASE_URL должен содержать правильный пользователь:
```env
DATABASE_URL=postgresql://your_username@localhost:5432/url_shortener
```

Замените `your_username` на ваше имя пользователя Mac (текущий пользователь).

Проверьте имя пользователя:
```bash
whoami
```

## 🆘 Если миграции выполнены, но все еще ошибки

Проверьте что таблицы созданы:
```bash
psql url_shortener -c "\dt"
```

Вы должны увидеть:
```
             List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+----------
 public | api_keys          | table | username
 public | clicks            | table | username
 public | link_tags         | table | username
 public | migrations        | table | username
 public | password_resets   | table | username
 public | tags              | table | username
 public | urls              | table | username
 public | users             | table | username
 public | webhook_logs      | table | username
 public | webhooks          | table | username
```

## 📞 Если проблемы остались

1. Пришлите вывод команды:
```bash
npm run migrate
```

2. Пришлите вывод команды:
```bash
psql url_shortener -c "\dt"
```

3. Пришлите ошибки из консоли браузера (F12)

---

**После выполнения этих шагов все должно работать!**
