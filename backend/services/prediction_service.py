"""
Congestion prediction service.

Loads the trained Random Forest model and LabelEncoders from disk,
then exposes predict_congestion() with the exact same logic as the
notebook (Cell 27).
"""

import os
import joblib
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MODEL_DIR = os.path.join(_BASE_DIR, "models")

# ── Load artifacts once at import time ───────────────────────────────
model = joblib.load(os.path.join(_MODEL_DIR, "queue_prediction_model.pkl"))
line_encoder = joblib.load(os.path.join(_MODEL_DIR, "line_encoder.pkl"))
station_encoder = joblib.load(os.path.join(_MODEL_DIR, "station_encoder.pkl"))
direction_encoder = joblib.load(os.path.join(_MODEL_DIR, "direction_encoder.pkl"))


def predict_congestion(
    hour: int,
    is_weekend: int,
    rush_hour: int,
    line: str,
    station: str,
    direction: str,
) -> float:
    """
    Predict congestion level for a given station/time combination.

    Parameters
    ----------
    hour        : Hour of the day (0-23).
    is_weekend  : 1 if weekend/holiday, 0 if weekday.
    rush_hour   : 1 if rush hour (7-9 or 17-19), 0 otherwise.
    line        : Subway line name  (e.g. '1호선').
    station     : Station name      (e.g. '서울역').
    direction   : Direction string  (e.g. '상선').

    Returns
    -------
    float – Predicted congestion score.
    """
    # Encode categorical values (identical to notebook Cell 27)
    line_encoded = line_encoder.transform([line])[0]
    station_encoded = station_encoder.transform([station])[0]
    direction_encoded = direction_encoder.transform([direction])[0]

    # Build input DataFrame with the exact feature order the model expects
    input_data = pd.DataFrame({
        "Hour": [hour],
        "IsWeekend": [is_weekend],
        "RushHour": [rush_hour],
        "호선_encoded": [line_encoded],
        "출발역_encoded": [station_encoded],
        "상하구분_encoded": [direction_encoded],
    })

    prediction = model.predict(input_data)
    return float(prediction[0])
