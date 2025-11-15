-- Add is_archived column to urls table
ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create index for faster archived queries
CREATE INDEX IF NOT EXISTS idx_urls_archived ON urls(user_id, is_archived);

-- Add archived_at timestamp for tracking
ALTER TABLE urls ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
