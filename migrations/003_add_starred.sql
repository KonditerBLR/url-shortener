-- Add is_starred column to urls table
ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Create index for faster starred queries
CREATE INDEX IF NOT EXISTS idx_urls_starred ON urls(user_id, is_starred) WHERE is_starred = TRUE;
