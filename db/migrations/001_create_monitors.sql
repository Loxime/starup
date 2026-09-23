CREATE TABLE IF NOT EXISTS monitors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('json', 'html')),
    selector TEXT,
    json_path TEXT,
    interval_seconds INTEGER NOT NULL DEFAULT 300,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitors_enabled
    ON monitors(enabled);
