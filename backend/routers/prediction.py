"""
Congestion prediction router.

POST /predict
  → predicts congestion, estimates wait time, persists to MySQL.
"""

import logging

from fastapi import APIRouter, HTTPException

from schemas.prediction import PredictionRequest, PredictionResponse
from services.prediction_service import predict_congestion
from services.wait_time_service import estimate_wait_time
from database.db import save_prediction

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict station congestion and wait time",
    description=(
        "Loads the trained Random Forest model, encodes categorical inputs, "
        "generates a congestion prediction, estimates wait time, persists "
        "the result to MySQL, and returns the prediction."
    ),
)
def predict(request: PredictionRequest) -> PredictionResponse:
    # ── 1. Predict congestion ────────────────────────────────────────
    try:
        congestion = predict_congestion(
            hour=request.hour,
            day_type=request.day_type,
            line=request.line,
            station=request.station,
            direction=request.direction,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Encoding error — unknown label for line/station/direction: {e}",
        )

    # ── 2. Estimate wait time ────────────────────────────────────────
    wait_time = estimate_wait_time(congestion)

    # ── 3. Persist to MySQL (Compute rush_hour server-side for analytics) ─
    # Rush Hour defined as 7-9 AM or 5-7 PM (17:00 - 19:00)
    rush_hour = 1 if (7.0 <= request.hour <= 9.0) or (17.0 <= request.hour <= 19.0) else 0

    try:
        save_prediction(
            station_name=request.station,
            subway_line=request.line,
            direction=request.direction,
            hour_value=request.hour,
            day_type=request.day_type,
            rush_hour=rush_hour,
            predicted_congestion=congestion,
            estimated_wait_time=wait_time,
        )
    except Exception as e:
        logger.warning("DB persist failed (non-blocking): %s", e)

    # ── 4. Return response ───────────────────────────────────────────
    return PredictionResponse(
        predicted_congestion=round(congestion, 2),
        estimated_wait_time=wait_time,
    )
