# Конкретные улучшения кода

## До и После рефакторинга

### 1. Создание короткой ссылки

#### ❌ До (routes.js, строки 77-164)
```javascript
router.post('/shorten', unifiedAuth, async (req, res) => {
  try {
    const { url, customCode, password, expiresInDays } = req.body;

    // Валидация вручную
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user?.userId || null;
    let shortCode;

    // Проверка customCode
    if (customCode) {
      if (!/^[a-zA-Z0-9-_]+$/.test(customCode)) {
        return res.status(400).json({ error: 'Custom code can only contain letters, numbers, hyphens and underscores' });
      }
      if (customCode.length < 3 || customCode.length > 50) {
        return res.status(400).json({ error: 'Custom code must be between 3 and 50 characters' });
      }

      const exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [customCode]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'This custom code is already taken. Please choose another one.' });
      }

      shortCode = customCode;
    } else {
      shortCode = generateShortCode();
      let exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      while (exists.rows.length > 0) {
        shortCode = generateShortCode();
        exists = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
      }
    }

    // Handle password protection
    let passwordHash = null;
    if (password && password.trim() !== '') {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Handle expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    await db.query(
      'INSERT INTO urls (original_url, short_code, user_id, password_hash, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [url, shortCode, userId, passwordHash, expiresAt]
    );

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    // Fire webhook
    if (userId) {
      fireWebhook(userId, 'link.created', {
        short_code: shortCode,
        original_url: url,
        short_url: shortUrl,
        has_password: !!passwordHash,
        expires_at: expiresAt
      }).catch(err => console.error('Webhook error:', err));
    }

    res.json({
      success: true,
      originalUrl: url,
      shortUrl,
      shortCode,
      qrCode,
      has_password: !!passwordHash,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Проблемы:**
- ❌ Валидация разбросана по коду
- ❌ Бизнес-логика смешана с HTTP обработкой
- ❌ Прямые SQL запросы в маршруте
- ❌ Хардкод констант (3, 50, 4, 10)
- ❌ Общая обработка ошибок
- ❌ Сложно тестировать

---

#### ✅ После

**Маршрут (src/routes/urlRoutes.js):**
```javascript
router.post(
  '/shorten',
  validateShortenRequest,  // Валидация вынесена
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId || null;
    const result = await urlService.createShortUrl(req.body, userId);
    res.json(result);
  })
);
```

**Валидатор (src/validators/urlValidator.js):**
```javascript
const validateShortenRequest = (req, res, next) => {
  const { url, customCode, password, expiresInDays } = req.body;

  if (!url) throw new ValidationError('URL is required');
  if (!isValidUrl(url)) throw new ValidationError('Invalid URL format');

  if (customCode) {
    if (!isValidShortCode(customCode)) {
      throw new ValidationError('Custom code can only contain letters, numbers, hyphens and underscores');
    }

    const { customCodeMinLength, customCodeMaxLength } = config.shortCode;
    if (customCode.length < customCodeMinLength || customCode.length > customCodeMaxLength) {
      throw new ValidationError(`Custom code must be between ${customCodeMinLength} and ${customCodeMaxLength} characters`);
    }
  }

  if (password && password.trim() !== '') {
    if (password.length < config.password.linkPasswordMinLength) {
      throw new ValidationError(`Password must be at least ${config.password.linkPasswordMinLength} characters`);
    }
  }

  next();
};
```

**Сервис (src/services/urlService.js):**
```javascript
class UrlService {
  async createShortUrl(urlData, userId = null) {
    const { url, customCode, password, expiresInDays } = urlData;

    // Генерация кода
    let shortCode = customCode || generateShortCode();

    if (customCode) {
      const exists = await urlRepository.findByShortCode(customCode);
      if (exists) {
        throw new ConflictError('This custom code is already taken');
      }
    } else {
      let exists = await urlRepository.findByShortCode(shortCode);
      while (exists) {
        shortCode = generateShortCode();
        exists = await urlRepository.findByShortCode(shortCode);
      }
    }

    // Хеширование пароля
    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, config.password.saltRounds);
    }

    // Обработка expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Сохранение через репозиторий
    await urlRepository.create({
      originalUrl: url,
      shortCode,
      userId,
      passwordHash,
      expiresAt,
    });

    const shortUrl = `${config.app.baseUrl}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    return {
      success: true,
      originalUrl: url,
      shortUrl,
      shortCode,
      qrCode,
      has_password: !!passwordHash,
      expires_at: expiresAt,
    };
  }
}
```

**Репозиторий (src/repositories/urlRepository.js):**
```javascript
class UrlRepository {
  async findByShortCode(shortCode) {
    const result = await db.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    return result.rows[0] || null;
  }

  async create(urlData) {
    const { originalUrl, shortCode, userId, passwordHash, expiresAt } = urlData;
    const result = await db.query(
      'INSERT INTO urls (original_url, short_code, user_id, password_hash, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [originalUrl, shortCode, userId, passwordHash, expiresAt]
    );
    return result.rows[0];
  }
}
```

**Преимущества:**
- ✅ Чистый и читаемый код
- ✅ Разделение ответственности
- ✅ Легко тестировать каждый слой отдельно
- ✅ Переиспользуемая валидация
- ✅ Конфигурация в одном месте
- ✅ Типизированные ошибки

---

### 2. Аутентификация

#### ❌ До (auth.js, строки 10-56)
```javascript
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 8 символов' });
        }

        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const result = await db.query(
            'INSERT INTO users (email, password_hash, verification_token, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING id, email',
            [email, passwordHash, verificationToken]
        );

        const user = result.rows[0];

        await sendVerificationEmail(email, verificationToken);

        res.json({
            success: true,
            message: 'Регистрация успешна! Проверьте вашу почту для подтверждения email.',
            needsVerification: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
```

#### ✅ После

**Маршрут:**
```javascript
router.post(
  '/register',
  validateRegister,  // Валидация
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.json(result);
  })
);
```

**Сервис:**
```javascript
class AuthService {
  async register(email, password) {
    // Проверка существования
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Хеширование
    const passwordHash = await bcrypt.hash(password, config.password.saltRounds);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Создание через репозиторий
    const user = await userRepository.create({
      email,
      passwordHash,
      verificationToken,
    });

    // Отправка email
    await sendVerificationEmail(email, verificationToken);

    return {
      success: true,
      message: 'Registration successful! Please check your email.',
      needsVerification: true,
    };
  }
}
```

---

### 3. Обработка ошибок

#### ❌ До
```javascript
try {
  // ... код ...
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
```

**Проблемы:**
- Все ошибки обрабатываются одинаково
- Всегда возвращается 500
- Нет различия между разными типами ошибок
- Дублирование кода

#### ✅ После

**Кастомные ошибки:**
```javascript
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}
```

**Использование:**
```javascript
// В сервисе
if (!url) {
  throw new NotFoundError('Link not found');
}

if (customCode.length < 3) {
  throw new ValidationError('Custom code too short');
}
```

**Централизованный обработчик:**
```javascript
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Автоматическое логирование
  if (statusCode === 500) {
    console.error('Error:', err);
  }

  // Обработка специфичных ошибок
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // Защита от утечки в production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  res.status(statusCode).json({ error: message });
};
```

**Преимущества:**
- ✅ Правильные HTTP статусы
- ✅ Один обработчик для всех ошибок
- ✅ Автоматическое логирование
- ✅ Защита данных в production

---

### 4. Конфигурация

#### ❌ До
```javascript
// В разных местах кода:
if (password.length < 8) { ... }
if (customCode.length < 3 || customCode.length > 50) { ... }
const maxKeys = 10;
const expiresIn = '30d';
```

#### ✅ После
```javascript
// src/config/index.js
module.exports = {
  password: {
    minLength: 8,
    saltRounds: 10,
    linkPasswordMinLength: 4,
  },
  shortCode: {
    length: 6,
    customCodeMinLength: 3,
    customCodeMaxLength: 50,
  },
  apiKey: {
    maxPerUser: 10,
  },
  jwt: {
    expiresIn: '30d',
  },
};

// Использование
if (password.length < config.password.minLength) { ... }
```

---

## Примеры тестирования

### До рефакторинга
```javascript
// Невозможно протестировать без реального HTTP сервера
```

### После рефакторинга

**Тест сервиса:**
```javascript
describe('UrlService', () => {
  it('should create short URL', async () => {
    // Mock репозиторий
    urlRepository.findByShortCode = jest.fn().mockResolvedValue(null);
    urlRepository.create = jest.fn().mockResolvedValue({ id: 1 });

    const result = await urlService.createShortUrl({
      url: 'https://example.com'
    });

    expect(result.shortUrl).toBeDefined();
    expect(urlRepository.create).toHaveBeenCalled();
  });
});
```

**Тест репозитория:**
```javascript
describe('UrlRepository', () => {
  it('should find URL by short code', async () => {
    const url = await urlRepository.findByShortCode('abc123');
    expect(url).toBeDefined();
    expect(url.short_code).toBe('abc123');
  });
});
```

**Тест маршрута:**
```javascript
describe('POST /api/shorten', () => {
  it('should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/api/shorten')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });
});
```

---

## Итоговые метрики

| Характеристика | До | После |
|----------------|-----|-------|
| **Строк в крупнейшем файле** | 1448 | ~200 |
| **Уровней абстракции** | 1 | 4 |
| **Тестируемость** | Низкая | Высокая |
| **Дублирование кода** | Высокое | Минимальное |
| **Читаемость** | Низкая | Высокая |
| **Поддерживаемость** | Сложная | Простая |
