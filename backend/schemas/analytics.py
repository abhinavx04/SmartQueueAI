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
    hour: int
    avg_wait_time: float


class TrendResponse(BaseModel):
    items: List[TrendItem]
