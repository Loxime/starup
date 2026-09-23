ALTER TABLE monitors
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'healthy', 'error')),
    ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_monitors_status
    ON monitors(status);
