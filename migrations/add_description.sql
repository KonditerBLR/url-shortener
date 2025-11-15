-- Add description column to urls table
ALTER TABLE urls ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for faster searches (if needed later)
CREATE INDEX IF NOT EXISTS idx_urls_description ON urls(user_id) WHERE description IS NOT NULL;
