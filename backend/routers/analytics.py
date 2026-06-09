"""
Analytics router.

Exposes endpoints for the Analytics Dashboard.
"""

from fastapi import APIRouter

from schemas.analytics import (
    FeatureImportanceResponse,
    DistributionResponse,
    HistoryResponse,
    TrendResponse,
)
from services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/feature-importance", response_model=FeatureImportanceResponse)
def get_feature_importance() -> FeatureImportanceResponse:
    """Get the feature importances from the Random Forest model."""
    items = analytics_service.get_feature_importances()
    return FeatureImportanceResponse(items=items)


@router.get("/distribution", response_model=DistributionResponse)
def get_distribution() -> DistributionResponse:
    """Get the distribution of historical congestion predictions."""
    items = analytics_service.get_congestion_distribution()
    return DistributionResponse(items=items)


@router.get("/history", response_model=HistoryResponse)
def get_history(limit: int = 20) -> HistoryResponse:
    """Get the most recent prediction history."""
    items = analytics_service.get_recent_history(limit=limit)
    return HistoryResponse(items=items)


@router.get("/trends", response_model=TrendResponse)
def get_trends() -> TrendResponse:
    """Get the average wait time trends by hour."""
    items = analytics_service.get_wait_time_trends()
    return TrendResponse(items=items)
