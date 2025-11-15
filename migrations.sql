-- Миграции для обновления существующей базы данных
-- Запускайте эти команды если у вас уже есть созданная БД

-- Добавление новых полей в таблицу urls
ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE urls ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE urls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Изменение длины short_code для поддержки длинных кастомных кодов
ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(50);

-- Добавление геолокации в clicks
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Добавление новых индексов
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at);
CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS update_urls_updated_at ON urls;
CREATE TRIGGER update_urls_updated_at
    BEFORE UPDATE ON urls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
