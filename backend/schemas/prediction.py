"""
Pydantic models for congestion prediction endpoints.
"""

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Request body for POST /predict."""

    hour: float = Field(..., ge=0.0, le=23.5, description="Hour of the day as float (e.g., 8.0, 8.5)")
    day_type: int = Field(..., ge=0, le=2, description="Day type: 0=Weekday, 1=Saturday, 2=Sunday")
    line: str = Field(..., min_length=1, description="Subway line name (e.g. '1호선')")
    station: str = Field(..., min_length=1, description="Station name (e.g. '서울역')")
    direction: str = Field(..., min_length=1, description="Direction (e.g. '상선' or '하선')")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "hour": 8.5,
                    "day_type": 0,
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
