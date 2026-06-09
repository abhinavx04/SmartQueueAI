"""
Wait time estimation router.

POST /wait-time/estimate
  → estimates queue wait time from a congestion value.
"""

from fastapi import APIRouter

from schemas.wait_time import WaitTimeRequest, WaitTimeResponse
from services.wait_time_service import estimate_wait_time

router = APIRouter(prefix="/wait-time", tags=["Wait Time"])


@router.post(
    "/estimate",
    response_model=WaitTimeResponse,
    summary="Estimate queue wait time",
    description=(
        "Estimates the waiting time in minutes given a predicted "
        "congestion level and an optional service rate."
    ),
)
def wait_time(request: WaitTimeRequest) -> WaitTimeResponse:
    minutes = estimate_wait_time(
        congestion=request.congestion,
        service_rate=request.service_rate,
    )

    return WaitTimeResponse(
        congestion=request.congestion,
        service_rate=request.service_rate,
        estimated_wait_time_minutes=minutes,
    )
