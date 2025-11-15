-- Add expires_at column to urls table
ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Create index for faster expiration queries
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;

-- Add index for checking expired links
CREATE INDEX IF NOT EXISTS idx_urls_expired ON urls(user_id, expires_at) WHERE expires_at IS NOT NULL;
