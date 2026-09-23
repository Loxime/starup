CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY,
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    value DOUBLE PRECISION NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurements_monitor_id
    ON measurements(monitor_id);

CREATE INDEX IF NOT EXISTS idx_measurements_monitor_measured_at
    ON measurements(monitor_id, measured_at DESC);
