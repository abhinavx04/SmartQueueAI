"""
Alternative station recommendation service.

Scans all known stations for a given line/direction/time and returns
the least congested options — identical logic to notebook Cell 35.
"""

import os
import pandas as pd

from services.prediction_service import predict_congestion

# ── Load unique station list from dataset (same source as notebook) ──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "subway_congestion.csv")

_df = pd.read_csv(_DATASET_PATH)
_ALL_STATIONS = _df["출발역"].unique().tolist()


def recommend_less_crowded_stations(
    hour: int,
    is_weekend: int,
    rush_hour: int,
    line: str,
    direction: str,
    top_n: int = 5,
) -> pd.DataFrame:
    """
    Return the *top_n* least-congested stations for the given context.

    Parameters
    ----------
    hour        : Hour of the day (0-23).
    is_weekend  : 1 if weekend/holiday, 0 if weekday.
    rush_hour   : 1 if rush hour, 0 otherwise.
    line        : Subway line  (e.g. '1호선').
    direction   : Direction    (e.g. '상선').
    top_n       : Number of recommendations to return.

    Returns
    -------
    pd.DataFrame with columns ['Station', 'Predicted_Congestion'],
    sorted ascending by predicted congestion.
    """
    recommendations = []

    for station in _ALL_STATIONS:
        try:
            congestion = predict_congestion(
                hour=hour,
                is_weekend=is_weekend,
                rush_hour=rush_hour,
                line=line,
                station=station,
                direction=direction,
            )
            recommendations.append({
                "Station": station,
                "Predicted_Congestion": congestion,
            })
        except Exception:
            # Station may not exist for this line/encoder combination
            pass

    recommendations_df = pd.DataFrame(recommendations)
    recommendations_df = recommendations_df.sort_values(
        by="Predicted_Congestion"
    )
    return recommendations_df.head(top_n)
