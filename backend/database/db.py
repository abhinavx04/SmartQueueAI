"""
Centralized MySQL connection manager.

Provides a reusable connection pool to the smart_queue_ai database.
All services import get_connection() from here instead of managing
their own connections.

Table schema (predictions):
  id                    INT AUTO_INCREMENT PRIMARY KEY
  station_name          VARCHAR(100)
  subway_line           VARCHAR(50)
  direction             VARCHAR(50)
  hour_value            INT
  is_weekend            TINYINT(1)
  rush_hour             TINYINT(1)
  predicted_congestion  FLOAT
  estimated_wait_time   FLOAT
  prediction_time       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
"""

import logging
import os
from datetime import datetime

import mysql.connector
from mysql.connector import pooling, Error as MySQLError

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────
_DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "ArP@731900"),
    "database": os.getenv("DB_NAME", "smart_queue_ai"),
}

_POOL_NAME = "smart_queue_pool"
_POOL_SIZE = 5

# ── Connection Pool (lazy-initialised) ───────────────────────────────
_pool: pooling.MySQLConnectionPool | None = None


def _init_pool() -> pooling.MySQLConnectionPool:
    """Create the connection pool on first use."""
    global _pool
    if _pool is None:
        try:
            _pool = pooling.MySQLConnectionPool(
                pool_name=_POOL_NAME,
                pool_size=_POOL_SIZE,
                pool_reset_session=True,
                **_DB_CONFIG,
            )
            logger.info("MySQL connection pool '%s' created (size=%d)", _POOL_NAME, _POOL_SIZE)
        except MySQLError as e:
            logger.error("Failed to create MySQL connection pool: %s", e)
            raise
    return _pool


def get_connection() -> mysql.connector.MySQLConnection:
    """
    Return a connection from the pool.

    Usage:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(...)
            conn.commit()
        finally:
            conn.close()   # returns connection to the pool
    """
    pool = _init_pool()
    return pool.get_connection()


def save_prediction(
    station_name: str,
    subway_line: str,
    direction: str,
    hour_value: int,
    is_weekend: int,
    rush_hour: int,
    predicted_congestion: float,
    estimated_wait_time: float,
) -> None:
    """
    Insert a prediction row into the `predictions` table.

    The `prediction_time` column is auto-populated by MySQL
    (DEFAULT CURRENT_TIMESTAMP), but we also pass it explicitly
    to ensure the application timestamp is recorded.

    Raises
    ------
    mysql.connector.Error
        On connection or query failure (caller decides whether to
        propagate or swallow).
    """
    query = """
    INSERT INTO predictions (
        station_name,
        subway_line,
        direction,
        hour_value,
        is_weekend,
        rush_hour,
        predicted_congestion,
        estimated_wait_time,
        prediction_time
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        station_name,
        subway_line,
        direction,
        hour_value,
        is_weekend,
        rush_hour,
        float(predicted_congestion),
        float(estimated_wait_time),
        datetime.now(),
    )

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
        logger.info(
            "Prediction saved: station=%s line=%s congestion=%.2f wait=%.2f",
            station_name, subway_line, predicted_congestion, estimated_wait_time,
        )
    except MySQLError as e:
        conn.rollback()
        logger.error("Failed to save prediction: %s", e)
        raise
    finally:
        conn.close()
