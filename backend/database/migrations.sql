-- ============================================================
-- Smart Queue AI — Database Migration Script
-- GT-11: Missing Database Indexes
-- GT-07: Add day_type column (3-class encoding)
-- GT-01: Ensure hour_value stored as FLOAT
-- ============================================================
-- Run this once against the smart_queue_ai database.
-- The IF NOT EXISTS / SHOW INDEX guards make it idempotent.
-- ============================================================

USE smart_queue_ai;

-- ── 1. Create predictions table (if it does not yet exist) ──────────
CREATE TABLE IF NOT EXISTS predictions (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    station_name         VARCHAR(100),
    subway_line          VARCHAR(50),
    direction            VARCHAR(50),
    hour_value           FLOAT,          -- float: 8.0, 8.5 etc. (GT-01)
    day_type             TINYINT,        -- 0=Weekday, 1=Saturday, 2=Sunday (GT-07)
    rush_hour            TINYINT(1),     -- Retained for analytics only, computed server-side (GT-06)
    predicted_congestion FLOAT,
    estimated_wait_time  FLOAT,
    prediction_time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Migrate hour_value to FLOAT if it was INT ─────────────────────
-- (Safe: widening conversion, no data loss)
ALTER TABLE predictions MODIFY COLUMN hour_value FLOAT;

-- ── 3. Add day_type column if missing (GT-07) ────────────────────────
-- Check and add performed via stored procedure for idempotency
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'predictions'
      AND COLUMN_NAME  = 'day_type'
);

SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE predictions ADD COLUMN day_type TINYINT AFTER direction',
    'SELECT "day_type column already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 4. Drop is_weekend if it still exists (legacy cleanup) ──────────
SET @wd_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'predictions'
      AND COLUMN_NAME  = 'is_weekend'
);

SET @sql2 = IF(
    @wd_exists > 0,
    'ALTER TABLE predictions DROP COLUMN is_weekend',
    'SELECT "is_weekend column does not exist, skipping" AS info'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ── 5. Create index on prediction_time (GT-11) ───────────────────────
-- Speeds up: analytics history queries, time-range filtering
CREATE INDEX IF NOT EXISTS idx_prediction_time
    ON predictions(prediction_time);

-- ── 6. Create index on hour_value (GT-11) ────────────────────────────
-- Speeds up: wait-time trend aggregation grouped by hour
CREATE INDEX IF NOT EXISTS idx_hour
    ON predictions(hour_value);

-- ── 7. Create composite index for common analytics pattern ───────────
-- Speeds up: "congestion by line + hour" queries
CREATE INDEX IF NOT EXISTS idx_line_hour
    ON predictions(subway_line, hour_value);

-- ── 8. Create index on predicted_congestion (GT-11) ──────────────────
-- Speeds up: distribution bucketing queries (CASE WHEN ...)
CREATE INDEX IF NOT EXISTS idx_congestion
    ON predictions(predicted_congestion);

-- ── Verification ─────────────────────────────────────────────────────
SHOW INDEX FROM predictions;
DESCRIBE predictions;
