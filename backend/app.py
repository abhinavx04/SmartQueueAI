"""
Smart Queue AI – Application entry point.

Demonstrates the full prediction → wait-time → recommendation → DB pipeline
using the refactored service modules.
"""

from services.prediction_service import predict_congestion
from services.wait_time_service import estimate_wait_time
from services.recommendation_service import recommend_less_crowded_stations
from database.db import save_prediction


def main() -> None:
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    # ── 1. Predict congestion ────────────────────────────────────────
    station_name = "서울역"
    subway_line = "1호선"
    direction = "상선"
    hour_value = 8
    is_weekend = 0
    rush_hour = 1

    predicted_congestion = predict_congestion(
        hour=hour_value,
        is_weekend=is_weekend,
        rush_hour=rush_hour,
        line=subway_line,
        station=station_name,
        direction=direction,
    )
    print(f"Predicted Congestion: {predicted_congestion}")

    # ── 2. Estimate wait time ────────────────────────────────────────
    wait_time = estimate_wait_time(predicted_congestion)
    print(f"Estimated Wait Time : {wait_time} minutes")

    # ── 3. Get recommendations ───────────────────────────────────────
    recommendations = recommend_less_crowded_stations(
        hour=hour_value,
        is_weekend=is_weekend,
        rush_hour=rush_hour,
        line=subway_line,
        direction=direction,
        top_n=10,
    )
    print("\nLess Crowded Station Recommendations:")
    print(recommendations.to_string(index=False))

    # ── 4. Save to MySQL ─────────────────────────────────────────────
    try:
        save_prediction(
            station_name=station_name,
            subway_line=subway_line,
            direction=direction,
            hour_value=hour_value,
            is_weekend=is_weekend,
            rush_hour=rush_hour,
            predicted_congestion=predicted_congestion,
            estimated_wait_time=wait_time,
        )
        print("\nPrediction saved to database successfully.")
    except Exception as e:
        print(f"\nDatabase save skipped: {e}")


if __name__ == "__main__":
    main()
