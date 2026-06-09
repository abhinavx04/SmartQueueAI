"""
Congestion prediction service.

Loads the trained HistGradientBoosting model and LabelEncoders from disk,
then exposes predict_congestion() with the updated 8-feature set:
  Hour, DayType, HourSin, HourCos, Line, Station, Direction, StationNumber
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

# ── Station number lookup (역번호) — geographic feature ───────────────
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "subway_congestion.csv")
_station_number_map: dict[str, int] = (
    pd.read_csv(_DATASET_PATH)[["출발역", "역번호"]]
    .drop_duplicates("출발역")
    .set_index("출발역")["역번호"]
    .to_dict()
)


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

    # Station number lookup (geographic feature)
    station_number = _station_number_map.get(station, 0)

    # Compute cyclic time features
    hour_sin = np.sin(2 * np.pi * hour / 24.0)
    hour_cos = np.cos(2 * np.pi * hour / 24.0)

    # Build input DataFrame with exact feature order the model expects
    input_data = pd.DataFrame({
        "Hour":            [float(hour)],
        "DayType":         [int(day_type)],
        "HourSin":         [hour_sin],
        "HourCos":         [hour_cos],
        "호선_encoded":    [line_encoded],
        "출발역_encoded":  [station_encoded],
        "상하구분_encoded": [direction_encoded],
        "StationNumber":   [int(station_number)],
    })

    prediction = model.predict(input_data)
    return float(prediction[0])
