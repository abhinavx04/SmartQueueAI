"""
Pydantic models for wait time estimation endpoints.
"""

from pydantic import BaseModel, Field


class WaitTimeRequest(BaseModel):
    """Request body for wait time estimation."""

    congestion: float = Field(..., ge=0, description="Predicted congestion level")
    service_rate: float = Field(5.0, gt=0, description="People processed per minute (default: 5)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "congestion": 82.58,
                    "service_rate": 5.0,
                }
            ]
        }
    }


class WaitTimeResponse(BaseModel):
    """Response body for wait time estimation."""

    congestion: float
    service_rate: float
    estimated_wait_time_minutes: float
