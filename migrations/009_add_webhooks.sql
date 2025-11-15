-- Create webhooks table for event notifications
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    webhook_name VARCHAR(255) NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_key VARCHAR(64),
    events TEXT[] NOT NULL DEFAULT ARRAY['link.clicked'],
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_logs table for tracking deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivered_at ON webhook_logs(delivered_at);

-- Add comments
COMMENT ON TABLE webhooks IS 'User-configured webhook endpoints for event notifications';
COMMENT ON COLUMN webhooks.events IS 'Array of event types to trigger this webhook (e.g., link.clicked, link.created)';
COMMENT ON COLUMN webhooks.secret_key IS 'Optional secret key for HMAC signature verification';
COMMENT ON TABLE webhook_logs IS 'Log of webhook delivery attempts';
