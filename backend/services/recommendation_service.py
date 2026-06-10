"""
Alternative station recommendation service.

Scans all valid stations for the requested subway line and direction,
estimates congestion in a single batch prediction call, and returns the
least congested options.
"""

import os
import heapq
import numpy as np
import pandas as pd

from services.prediction_service import model, line_encoder, station_encoder, direction_encoder

# ── Load and build station-to-line mappings at startup (GT-02) ────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "subway_congestion.csv")

_df = pd.read_csv(_DATASET_PATH)

# Build a lookup of line name to unique stations on that line
_LINE_STATIONS_MAP = _df.groupby("호선")["출발역"].unique().apply(list).to_dict()


def recommend_less_crowded_stations(
    hour: float,
    day_type: int,
    line: str,
    direction: str,
    top_n: int = 5,
    current_station: str | None = None,
) -> list[tuple[str, float]]:
    """
    Return the *top_n* least-congested stations for the given context,
    constrained to the requested line and optimized via Top-K heap ranking.

    Parameters
    ----------
    hour            : Hour of the day as float (e.g. 8.5).
    day_type        : Day type (0=weekday, 1=saturday, 2=sunday).
    line            : Subway line (e.g. '1호선').
    direction       : Direction (e.g. '상선').
    top_n           : Number of recommendations to return.
    current_station : If provided, this station is excluded from results
                      so the user is not recommended their current location.

    Returns
    -------
    list[tuple[str, float]] of (station, predicted_congestion) pairs,
    sorted ascending by predicted congestion.
    """
    # 1. Retrieve valid stations on this line (GT-02)
    stations_on_line = _LINE_STATIONS_MAP.get(line, [])
    # NM-05: Exclude the user's current station from candidates
    if current_station:
        stations_on_line = [s for s in stations_on_line if s != current_station]
    if not stations_on_line:
        return []

    # 2. Encode common inputs
    try:
        line_encoded = line_encoder.transform([line])[0]
        direction_encoded = direction_encoder.transform([direction])[0]
    except Exception:
        # If the requested line or direction is unknown, return empty
        return []

    # Map day_type (0=weekday, 1=saturday, 2=sunday) → IsWeekend (0 or 1)
    is_weekend = 1 if day_type >= 1 else 0

    # Compute RushHour server-side (7-9 AM or 5-7 PM)
    rush_hour = 1 if (7.0 <= hour <= 9.0) or (17.0 <= hour <= 19.0) else 0

    # 3. Filter and encode stations in batch (GT-08)
    valid_stations = []
    station_enc_list = []
    for station in stations_on_line:
        try:
            station_encoded = station_encoder.transform([station])[0]
            valid_stations.append(station)
            station_enc_list.append(station_encoded)
        except Exception:
            # Skip station if not recognized by encoder
            pass

    if not valid_stations:
        return []

    # 4. Construct input DataFrame for single batch prediction
    # Model features: ['Hour', 'IsWeekend', 'RushHour', '호선_encoded', '출발역_encoded', '상하구분_encoded']
    batch_df = pd.DataFrame({
        "Hour":            [float(hour)] * len(valid_stations),
        "IsWeekend":       [is_weekend] * len(valid_stations),
        "RushHour":        [rush_hour] * len(valid_stations),
        "호선_encoded":    [line_encoded] * len(valid_stations),
        "출발역_encoded":  station_enc_list,
        "상하구분_encoded": [direction_encoded] * len(valid_stations),
    })

    # 5. Run prediction
    predictions = model.predict(batch_df)

    # 6. Build and rank result using heapq (Top-K Heap ranking returning tuples)
    return heapq.nsmallest(
        top_n,
        zip(valid_stations, predictions),
        key=lambda x: x[1]
    )
