"""
Pydantic models for congestion prediction endpoints.
"""

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Request body for POST /predict."""

    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    is_weekend: int = Field(..., ge=0, le=1, description="1 if weekend/holiday, 0 if weekday")
    rush_hour: int = Field(..., ge=0, le=1, description="1 if rush hour (7-9 or 17-19), 0 otherwise")
    line: str = Field(..., min_length=1, description="Subway line name (e.g. '1호선')")
    station: str = Field(..., min_length=1, description="Station name (e.g. '서울역')")
    direction: str = Field(..., min_length=1, description="Direction (e.g. '상선' or '하선')")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "hour": 8,
                    "is_weekend": 0,
                    "rush_hour": 1,
                    "line": "1호선",
                    "station": "서울역",
                    "direction": "상선",
                }
            ]
        }
    }


class PredictionResponse(BaseModel):
    """Response body for POST /predict."""

    predicted_congestion: float
    estimated_wait_time: float
