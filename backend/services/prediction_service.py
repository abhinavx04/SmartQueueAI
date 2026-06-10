"""
Congestion prediction service.

Loads the trained model and LabelEncoders from disk,
then exposes predict_congestion() with the model's actual 6-feature set:
  Hour, IsWeekend, RushHour, 호선_encoded, 출발역_encoded, 상하구분_encoded
"""

import os
import joblib
import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MODEL_DIR = os.path.join(_BASE_DIR, "models")

# ── Load artifacts once at import time ───────────────────────────────
model             = joblib.load(os.path.join(_MODEL_DIR, "queue_prediction_model.pkl"))
line_encoder      = joblib.load(os.path.join(_MODEL_DIR, "line_encoder.pkl"))
station_encoder   = joblib.load(os.path.join(_MODEL_DIR, "station_encoder.pkl"))
direction_encoder = joblib.load(os.path.join(_MODEL_DIR, "direction_encoder.pkl"))


def predict_congestion(
    hour: float,
    day_type: int,
    line: str,
    station: str,
    direction: str,
) -> float:
    """
    Predict congestion level for a given station/time combination.

    Parameters
    ----------
    hour        : Hour of the day as float (e.g. 8.5).
    day_type    : Day type (0=weekday, 1=saturday, 2=sunday).
    line        : Subway line name  (e.g. '1호선').
    station     : Station name      (e.g. '서울역').
    direction   : Direction string  (e.g. '상선').

    Returns
    -------
    float – Predicted congestion score.
    """
    # Encode categorical values
    line_encoded      = line_encoder.transform([line])[0]
    station_encoded   = station_encoder.transform([station])[0]
    direction_encoded = direction_encoder.transform([direction])[0]

    # Map day_type (0=weekday, 1=saturday, 2=sunday) → IsWeekend (0 or 1)
    is_weekend = 1 if day_type >= 1 else 0

    # Compute RushHour server-side (7-9 AM or 5-7 PM)
    rush_hour = 1 if (7.0 <= hour <= 9.0) or (17.0 <= hour <= 19.0) else 0

    # Build input DataFrame with exact feature order the model expects:
    # ['Hour', 'IsWeekend', 'RushHour', '호선_encoded', '출발역_encoded', '상하구분_encoded']
    input_data = pd.DataFrame({
        "Hour":            [float(hour)],
        "IsWeekend":       [is_weekend],
        "RushHour":        [rush_hour],
        "호선_encoded":    [line_encoded],
        "출발역_encoded":  [station_encoded],
        "상하구분_encoded": [direction_encoded],
    })

    prediction = model.predict(input_data)
    return float(prediction[0])
