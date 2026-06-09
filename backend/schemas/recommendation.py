"""
Pydantic models for station recommendation endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class RecommendationRequest(BaseModel):
    """Request body for POST /recommend."""

    hour: float = Field(..., ge=0.0, le=23.5, description="Hour of the day as float (e.g., 8.0, 8.5)")
    day_type: int = Field(..., ge=0, le=2, description="Day type: 0=Weekday, 1=Saturday, 2=Sunday")
    line: str = Field(..., min_length=1, description="Subway line name (e.g. '1호선')")
    direction: str = Field(..., min_length=1, description="Direction (e.g. '상선')")
    current_station: Optional[str] = Field(None, description="User's current station (excluded from recommendations)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "hour": 8.5,
                    "day_type": 0,
                    "line": "1호선",
                    "direction": "상선",
                    "current_station": "서울역",
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
