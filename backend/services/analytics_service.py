"""
Analytics service.

Provides data for the Analytics Dashboard:
- Feature importances from the loaded Random Forest model.
- Aggregated insights (distribution, trends, history) from the MySQL database.
"""

import logging
from typing import List, Dict, Any
import mysql.connector

from database.db import get_connection
from services.prediction_service import model  # Reuse loaded model

logger = logging.getLogger(__name__)


def get_feature_importances() -> List[Dict[str, Any]]:
    """Return the feature importances from the Random Forest model."""
    feature_names = ["Hour", "IsWeekend", "RushHour", "Line", "Station", "Direction"]
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
    conn = get_connection()
    try:
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
    except mysql.connector.Error as e:
        logger.error("Failed to fetch congestion distribution: %s", e)
        return []
    finally:
        conn.close()


def get_recent_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Return the most recent predictions."""
    query = """
    SELECT id, station_name, subway_line, predicted_congestion, prediction_time
    FROM predictions
    ORDER BY prediction_time DESC
    LIMIT %s
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (limit,))
        rows = cursor.fetchall()
        
        # Format dates for JSON serialization
        for row in rows:
            if row.get("prediction_time"):
                row["prediction_time"] = row["prediction_time"].isoformat()
                
        return rows
    except mysql.connector.Error as e:
        logger.error("Failed to fetch prediction history: %s", e)
        return []
    finally:
        conn.close()


def get_wait_time_trends() -> List[Dict[str, Any]]:
    """Return average estimated wait time grouped by hour."""
    query = """
    SELECT hour_value AS hour, AVG(estimated_wait_time) AS avg_wait_time
    FROM predictions
    GROUP BY hour_value
    ORDER BY hour_value
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Fill in missing hours
        data_dict = {row["hour"]: float(row["avg_wait_time"]) for row in rows}
        return [{"hour": h, "avg_wait_time": data_dict.get(h, 0.0)} for h in range(24)]
    except mysql.connector.Error as e:
        logger.error("Failed to fetch wait time trends: %s", e)
        return [{"hour": h, "avg_wait_time": 0.0} for h in range(24)]
    finally:
        conn.close()
