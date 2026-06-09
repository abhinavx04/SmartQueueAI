"""
Alternative station recommendation service.

Scans all valid stations for the requested subway line and direction,
estimates congestion in a single batch prediction call, and returns the
least congested options.
"""

import os
import numpy as np
import pandas as pd

from services.prediction_service import model, line_encoder, station_encoder, direction_encoder

# ── Load and build station-to-line mappings at startup (GT-02) ────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "subway_congestion.csv")

_df = pd.read_csv(_DATASET_PATH)

# Build a lookup of line name to unique stations on that line
_LINE_STATIONS_MAP = _df.groupby("호선")["출발역"].unique().apply(list).to_dict()

# Build a lookup of station name to its station number (geographic feature)
_STATION_NUMBER_MAP: dict[str, int] = (
    _df[["출발역", "역번호"]]
    .drop_duplicates("출발역")
    .set_index("출발역")["역번호"]
    .to_dict()
)


def recommend_less_crowded_stations(
    hour: float,
    day_type: int,
    line: str,
    direction: str,
    top_n: int = 5,
    current_station: str | None = None,
) -> pd.DataFrame:
    """
    Return the *top_n* least-congested stations for the given context,
    constrained to the requested line and optimized via batch inference.

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
    pd.DataFrame with columns ['Station', 'Predicted_Congestion'],
    sorted ascending by predicted congestion.
    """
    # 1. Retrieve valid stations on this line (GT-02)
    stations_on_line = _LINE_STATIONS_MAP.get(line, [])
    # NM-05: Exclude the user's current station from candidates
    if current_station:
        stations_on_line = [s for s in stations_on_line if s != current_station]
    if not stations_on_line:
        return pd.DataFrame(columns=["Station", "Predicted_Congestion"])

    # 2. Encode common inputs
    try:
        line_encoded = line_encoder.transform([line])[0]
        direction_encoded = direction_encoder.transform([direction])[0]
    except Exception:
        # If the requested line or direction is unknown, return empty
        return pd.DataFrame(columns=["Station", "Predicted_Congestion"])

    hour_sin = np.sin(2 * np.pi * hour / 24.0)
    hour_cos = np.cos(2 * np.pi * hour / 24.0)

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
        return pd.DataFrame(columns=["Station", "Predicted_Congestion"])

    # 4. Construct input DataFrame for single batch prediction (GT-08)
    batch_df = pd.DataFrame({
        "Hour":            [float(hour)] * len(valid_stations),
        "DayType":         [int(day_type)] * len(valid_stations),
        "HourSin":         [hour_sin] * len(valid_stations),
        "HourCos":         [hour_cos] * len(valid_stations),
        "호선_encoded":    [line_encoded] * len(valid_stations),
        "출발역_encoded":  station_enc_list,
        "상하구분_encoded": [direction_encoded] * len(valid_stations),
        "StationNumber":   [int(_STATION_NUMBER_MAP.get(s, 0)) for s in valid_stations],
    })

    # 5. Run prediction
    predictions = model.predict(batch_df)

    # 6. Build and sort result
    recommendations_df = pd.DataFrame({
        "Station": valid_stations,
        "Predicted_Congestion": predictions,
    })
    recommendations_df = recommendations_df.sort_values(by="Predicted_Congestion")
    return recommendations_df.head(top_n)
