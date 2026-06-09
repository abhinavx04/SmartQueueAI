"""
Pydantic models for station recommendation endpoints.
"""

from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    """Request body for POST /recommend."""

    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    is_weekend: int = Field(..., ge=0, le=1, description="1 if weekend/holiday, 0 if weekday")
    rush_hour: int = Field(..., ge=0, le=1, description="1 if rush hour, 0 otherwise")
    line: str = Field(..., min_length=1, description="Subway line name (e.g. '1호선')")
    direction: str = Field(..., min_length=1, description="Direction (e.g. '상선')")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "hour": 8,
                    "is_weekend": 0,
                    "rush_hour": 1,
                    "line": "1호선",
                    "direction": "상선",
                }
            ]
        }
    }


class StationCongestion(BaseModel):
    """A single station with its predicted congestion."""

    station: str
    predicted_congestion: float


class RecommendationResponse(BaseModel):
    """Response body for POST /recommend."""

    recommendations: list[StationCongestion]
