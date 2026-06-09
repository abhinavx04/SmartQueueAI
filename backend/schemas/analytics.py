"""
Pydantic models for analytics endpoints.
"""

from pydantic import BaseModel
from typing import List


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class FeatureImportanceResponse(BaseModel):
    items: List[FeatureImportanceItem]


class DistributionItem(BaseModel):
    level: str
    count: int


class DistributionResponse(BaseModel):
    items: List[DistributionItem]


class HistoryItem(BaseModel):
    id: int
    station_name: str
    subway_line: str
    predicted_congestion: float
    prediction_time: str


class HistoryResponse(BaseModel):
    items: List[HistoryItem]


class TrendItem(BaseModel):
    hour: float  # FLOAT: matches hour_value column (e.g. 8.0, 8.5) — GT-01
    avg_wait_time: float


class TrendResponse(BaseModel):
    items: List[TrendItem]
