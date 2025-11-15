# 🚀 Инструкция по запуску URL Shortener на macOS

## 📋 Предварительные требования

### 1. Установка Homebrew (если еще не установлен)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Установка Node.js
```bash
brew install node
```

Проверьте установку:
```bash
node --version  # Должно быть v18 или выше
npm --version
```

### 3. Установка PostgreSQL
```bash
brew install postgresql@15
brew services start postgresql@15
```

Добавьте PostgreSQL в PATH (добавьте в ~/.zshrc или ~/.bash_profile):
```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

Перезагрузите терминал или выполните:
```bash
source ~/.zshrc  # или source ~/.bash_profile
```

Проверьте установку:
```bash
psql --version
```

## 🔧 Настройка проекта

### 1. Клонирование/Обновление репозитория

Если проект уже есть локально, обновите его:
```bash
cd /path/to/url-shortener
git fetch origin
git checkout claude/project-analysis-postgres-fix-01JECrhyCwsaekWcWfPdd297
git pull origin claude/project-analysis-postgres-fix-01JECrhyCwsaekWcWfPdd297
```

Если клонируете впервые:
```bash
git clone <repository-url> url-shortener
cd url-shortener
git checkout claude/project-analysis-postgres-fix-01JECrhyCwsaekWcWfPdd297
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка базы данных PostgreSQL

Создайте базу данных:
```bash
# Подключитесь к PostgreSQL
psql postgres

# В psql выполните:
CREATE DATABASE url_shortener;
CREATE USER url_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE url_shortener TO url_user;

# Для PostgreSQL 15+ также выполните:
\c url_shortener
GRANT ALL ON SCHEMA public TO url_user;

# Выйдите из psql
\q
```

### 4. Настройка переменных окружения

Создайте файл `.env` в корне проекта:
```bash
touch .env
```

Откройте `.env` в VS Code или любом редакторе и добавьте:
```env
# Database Configuration
DB_USER=url_user
DB_HOST=localhost
DB_NAME=url_shortener
DB_PASSWORD=your_password_here
DB_PORT=5432

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long_12345678

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (для восстановления пароля)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=your-email@gmail.com
```

**ВАЖНО:** Для EMAIL_PASS используйте App-specific password из Gmail, а не обычный пароль!

### 5. Запуск миграций базы данных

Выполните все миграции в правильном порядке:

```bash
# Основные таблицы
psql -U url_user -d url_shortener -f migrations/init.sql

# Новые фичи (в порядке добавления)
psql -U url_user -d url_shortener -f migrations/add_tags.sql
psql -U url_user -d url_shortener -f migrations/add_starred.sql
psql -U url_user -d url_shortener -f migrations/add_descriptions.sql
psql -U url_user -d url_shortener -f migrations/add_archived.sql
psql -U url_user -d url_shortener -f migrations/add_expiration.sql
psql -U url_user -d url_shortener -f migrations/add_password_protection.sql
psql -U url_user -d url_shortener -f migrations/add_api_keys.sql
psql -U url_user -d url_shortener -f migrations/add_webhooks.sql
```

Или выполните все миграции одной командой:
```bash
for file in migrations/*.sql; do
  echo "Running $file..."
  psql -U url_user -d url_shortener -f "$file"
done
```

## 🚀 Запуск проекта

### Режим разработки (с hot reload):
```bash
npm run dev
```

### Продакшн режим:
```bash
npm start
```

Сервер запустится на `http://localhost:3000`

## 🧪 Тестирование функций

### 1. Регистрация и вход
- Откройте `http://localhost:3000`
- Зарегистрируйте новый аккаунт
- Проверьте email для верификации (если настроен SMTP)

### 2. Создание коротких ссылок
- Перейдите в Dashboard
- Создайте новую короткую ссылку
- Проверьте редирект

### 3. Продвинутые фичи

#### Теги (Tags)
- Создайте теги для организации ссылок
- Примените теги к ссылкам
- Используйте фильтр по тегам

#### Избранное (Starred)
- Добавьте ссылки в избранное (звездочка)
- Используйте фильтр "Show Favorites"

#### Архивирование (Archiving)
- Заархивируйте ненужные ссылки
- Переключайте "Show Archived" для просмотра

#### Срок действия (Expiration)
- Установите дату истечения для ссылки (иконка часов)
- Попробуйте открыть ссылку после истечения срока

#### Защита паролем (Password Protection)
- Установите пароль на ссылку (иконка замка)
- Откройте ссылку в инкогнито - должен появиться запрос пароля

#### API Keys
- Перейдите в раздел "API Keys"
- Создайте новый API ключ
- Сохраните ключ (показывается только один раз!)

Пример использования API:
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_your_api_key_here" \
  -d '{
    "url": "https://example.com",
    "customCode": "mylink",
    "password": "secret123",
    "expiresInDays": 30
  }'
```

#### Webhooks
- Перейдите в раздел "Webhooks"
- Создайте вебхук с вашим endpoint URL
- Выберите события (link.clicked, link.created)
- Сохраните secret key для проверки подписи

Пример проверки webhook signature (Node.js):
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

### 4. Аналитика
- Перейдите в раздел "Analytics"
- Просмотрите детальную статистику кликов
- Проверьте графики по устройствам, ОС, браузерам

## 🎨 Visual Studio Code

### Рекомендуемые расширения:
1. **ESLint** - проверка кода JavaScript
2. **PostgreSQL** - работа с базой данных
3. **Thunder Client** или **REST Client** - тестирование API
4. **GitLens** - улучшенная работа с Git

### Открытие проекта:
```bash
code /path/to/url-shortener
```

## 🐛 Решение проблем

### PostgreSQL не запускается
```bash
# Проверьте статус
brew services list

# Перезапустите сервис
brew services restart postgresql@15
```

### Ошибка подключения к БД
```bash
# Проверьте, что PostgreSQL запущен
psql -U url_user -d url_shortener -c "SELECT 1;"
```

### Порт 3000 занят
Измените PORT в `.env` файле на другой (например, 3001)

### Не приходят email
- Используйте Gmail App-specific password
- Включите "Less secure app access" (если используете старый способ)
- Проверьте логи в консоли

### Ошибки миграций
```bash
# Очистите БД и начните заново
psql -U url_user -d url_shortener -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Запустите миграции снова
for file in migrations/*.sql; do
  psql -U url_user -d url_shortener -f "$file"
done
```

## 📊 Структура проекта

```
url-shortener/
├── migrations/          # SQL миграции базы данных
├── public/             # Фронтенд файлы
│   ├── css/           # Стили
│   ├── js/            # JavaScript
│   └── *.html         # HTML страницы
├── auth.js            # Аутентификация
├── db.js              # Подключение к БД
├── routes.js          # API endpoints
├── server.js          # Express сервер
├── utils.js           # Утилиты
├── .env               # Переменные окружения
└── package.json       # Зависимости
```

## ✅ Checklist функций

- [x] Регистрация и вход
- [x] Создание коротких ссылок
- [x] Кастомные короткие коды
- [x] QR коды с кастомизацией
- [x] Теги для ссылок
- [x] Избранные ссылки
- [x] Массовые операции (удаление, экспорт)
- [x] Описания ссылок
- [x] Архивирование ссылок
- [x] Срок действия ссылок
- [x] Защита паролем
- [x] API ключи
- [x] Webhooks
- [x] Детальная аналитика
- [x] Темная тема
- [x] Адаптивный дизайн

## 🎯 Полезные команды

```bash
# Просмотр логов PostgreSQL
tail -f /opt/homebrew/var/log/postgresql@15.log

# Просмотр всех таблиц
psql -U url_user -d url_shortener -c "\dt"

# Резервная копия БД
pg_dump -U url_user url_shortener > backup.sql

# Восстановление из резервной копии
psql -U url_user url_shortener < backup.sql

# Очистка node_modules и переустановка
rm -rf node_modules package-lock.json
npm install
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте `.env` файл
2. Убедитесь что PostgreSQL запущен
3. Проверьте логи в терминале
4. Проверьте консоль браузера (F12)

---

**Приятного использования! 🎉**
