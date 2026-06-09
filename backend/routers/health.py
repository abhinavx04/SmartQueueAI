"""
Health check router.
"""

from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the current health status of the API.",
)
def health_check() -> HealthResponse:
    return HealthResponse(status="healthy")
