-- Add password_hash column to urls table for password-protected links
ALTER TABLE urls ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster password-protected links queries
CREATE INDEX IF NOT EXISTS idx_urls_password_protected ON urls(user_id) WHERE password_hash IS NOT NULL;
