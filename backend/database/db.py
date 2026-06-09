"""
Centralized MySQL connection manager.

Provides a reusable connection pool to the smart_queue_ai database.
All services import get_connection() from here instead of managing
their own connections.
"""

import os
import mysql.connector
from mysql.connector import pooling

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
        _pool = pooling.MySQLConnectionPool(
            pool_name=_POOL_NAME,
            pool_size=_POOL_SIZE,
            pool_reset_session=True,
            **_DB_CONFIG,
        )
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
    Insert a single prediction row into the `predictions` table.

    Reproduces the exact INSERT from notebook Cell 49.
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
        estimated_wait_time
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
    )

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
    finally:
        conn.close()
