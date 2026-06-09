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
    df = recommend_less_crowded_stations(
        hour=request.hour,
        is_weekend=request.is_weekend,
        rush_hour=request.rush_hour,
        line=request.line,
        direction=request.direction,
        top_n=10,
    )

    recommendations = [
        StationCongestion(
            station=row["Station"],
            predicted_congestion=round(row["Predicted_Congestion"], 2),
        )
        for _, row in df.iterrows()
    ]

    return RecommendationResponse(recommendations=recommendations)
