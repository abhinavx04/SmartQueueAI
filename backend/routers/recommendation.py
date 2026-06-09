"""
Station recommendation router.

POST /recommend
  → predicts congestion for all stations, ranks them,
    and returns the top 10 least congested.
"""

from fastapi import APIRouter

from schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    StationCongestion,
)
from services.recommendation_service import recommend_less_crowded_stations

router = APIRouter(tags=["Recommendation"])


@router.post(
    "/recommend",
    response_model=RecommendationResponse,
    summary="Recommend least congested stations",
    description=(
        "Predicts congestion for all known stations on the given line, "
        "ranks them by predicted congestion ascending, and returns the "
        "top 10 least-congested alternatives."
    ),
)
def recommend(request: RecommendationRequest) -> RecommendationResponse:
    recommendations_list = recommend_less_crowded_stations(
        hour=request.hour,
        day_type=request.day_type,
        line=request.line,
        direction=request.direction,
        top_n=10,
        current_station=request.current_station,  # NM-05: exclude user's own station
    )

    recommendations = [
        StationCongestion(
            station=station,
            predicted_congestion=round(float(congestion), 2),
        )
        for station, congestion in recommendations_list
    ]

    return RecommendationResponse(recommendations=recommendations)
