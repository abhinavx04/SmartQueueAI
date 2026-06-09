"""
Stations endpoint.

GET /stations
  → returns all valid station + line combinations from the training dataset,
    consumed by the frontend to populate dynamic dropdowns.
"""

import pandas as pd
import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/stations", tags=["Stations"])

# ── Build station-line map at startup ────────────────────────────────
_BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "subway_congestion.csv")

_df = pd.read_csv(_DATASET_PATH)
_STATIONS_LIST: list[dict] = (
    _df[["호선", "출발역"]]
    .drop_duplicates()
    .sort_values(["호선", "출발역"])
    .rename(columns={"호선": "line", "출발역": "station"})
    .to_dict(orient="records")
)

class StationItem(BaseModel):
    line: str
    station: str

@router.get(
    "",
    response_model=list[StationItem],
    summary="List all stations",
    description=(
        "Returns every unique (line, station) pair present in the training dataset. "
        "Use this to populate dynamic station selectors on the frontend. "
        f"Total: {len(_STATIONS_LIST)} station-line combinations."
    ),
)
def list_stations() -> list[StationItem]:
    """Return all valid (line, station) pairs from the training dataset."""
    return [StationItem(**s) for s in _STATIONS_LIST]
