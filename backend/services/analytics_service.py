"""
Analytics service.

Provides data for the Analytics Dashboard:
- Feature importances from the loaded Random Forest model.
- Aggregated insights (distribution, trends, history) from the MySQL database.
"""

import os
import joblib
import logging
from typing import List, Dict, Any
import mysql.connector

from database.db import get_connection
from services.prediction_service import model  # Reuse loaded model

logger = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MODEL_DIR = os.path.join(_BASE_DIR, "models")


def get_feature_importances() -> List[Dict[str, Any]]:
    """Return the feature importances (permutation importance if available, fallback to Gini)."""
    feature_names = ["Hour", "IsWeekend", "RushHour", "Line", "Station", "Direction"]
    
    try:
        importances_path = os.path.join(_MODEL_DIR, "permutation_importance.pkl")
        if os.path.exists(importances_path):
            p_imp = joblib.load(importances_path)
            importances = p_imp.importances_mean
        else:
            importances = model.feature_importances_
    except Exception as e:
        logger.warning("Failed to load permutation importance: %s. Falling back to Gini.", e)
        importances = model.feature_importances_

    result = []
    for name, imp in zip(feature_names, importances):
        result.append({"feature": name, "importance": float(imp)})
        
    # Sort by importance descending
    result.sort(key=lambda x: x["importance"], reverse=True)
    return result


def get_congestion_distribution() -> List[Dict[str, Any]]:
    """
    Return the distribution of predicted congestion levels
    from the historical predictions table.
    """
    query = """
    SELECT 
        CASE 
            WHEN predicted_congestion < 30 THEN 'Low'
            WHEN predicted_congestion < 60 THEN 'Moderate'
            WHEN predicted_congestion < 80 THEN 'High'
            ELSE 'Critical'
        END AS level,
        COUNT(*) AS count
    FROM predictions
    GROUP BY level
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Ensure all levels are present even if count is 0
        counts = {row["level"]: row["count"] for row in rows}
        return [
            {"level": "Low", "count": counts.get("Low", 0)},
            {"level": "Moderate", "count": counts.get("Moderate", 0)},
            {"level": "High", "count": counts.get("High", 0)},
            {"level": "Critical", "count": counts.get("Critical", 0)},
        ]
    except Exception as e:
        logger.error("Failed to fetch congestion distribution: %s", e)
        return [
            {"level": "Low", "count": 0},
            {"level": "Moderate", "count": 0},
            {"level": "High", "count": 0},
            {"level": "Critical", "count": 0},
        ]
    finally:
        if conn:
            conn.close()


def get_recent_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Return the most recent predictions."""
    query = """
    SELECT id, station_name, subway_line, predicted_congestion, prediction_time
    FROM predictions
    ORDER BY prediction_time DESC
    LIMIT %s
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (limit,))
        rows = cursor.fetchall()
        
        # Format dates for JSON serialization
        for row in rows:
            if row.get("prediction_time"):
                row["prediction_time"] = row["prediction_time"].isoformat()
                
        return rows
    except Exception as e:
        logger.error("Failed to fetch prediction history: %s", e)
        return []
    finally:
        if conn:
            conn.close()


def get_wait_time_trends() -> List[Dict[str, Any]]:
    """Return average estimated wait time grouped by hour."""
    query = """
    SELECT hour_value AS hour, AVG(estimated_wait_time) AS avg_wait_time
    FROM predictions
    GROUP BY hour_value
    ORDER BY hour_value
    """
    # All 40 time slots in the dataset (float hours, 30-min granularity, GT-01)
    all_slots = (
        [h + m for h in range(5, 24) for m in (0.0, 0.5)]
        + [0.0, 0.5]
    )
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        rows = cursor.fetchall()
        data_dict = {row["hour"]: float(row["avg_wait_time"]) for row in rows}
        return [{"hour": slot, "avg_wait_time": data_dict.get(slot, 0.0)} for slot in all_slots]
    except Exception as e:
        logger.error("Failed to fetch wait time trends: %s", e)
        return [{"hour": slot, "avg_wait_time": 0.0} for slot in all_slots]
    finally:
        if conn:
            conn.close()
