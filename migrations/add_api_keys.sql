-- Create api_keys table for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id, is_active);

-- Add comment for documentation
COMMENT ON TABLE api_keys IS 'API keys for programmatic access to the URL shortener';
COMMENT ON COLUMN api_keys.key_name IS 'User-defined name for the API key';
COMMENT ON COLUMN api_keys.key_hash IS 'BCrypt hash of the API key';
COMMENT ON COLUMN api_keys.key_prefix IS 'First few characters of the key for identification (e.g., "sk_12345")';
