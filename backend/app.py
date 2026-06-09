"""
Smart Queue AI — FastAPI Application.

Entry point for the REST API.  Run with:
    uvicorn app:app --reload --host 0.0.0.0 --port 8000

Swagger UI : http://localhost:8000/docs
ReDoc       : http://localhost:8000/redoc
"""

import logging as _logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import health, prediction, recommendation, wait_time, analytics, stations

# ── Application ───────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Queue AI",
    description=(
        "AI-Based Queue Prediction and Alternative Recommendation Platform. "
        "Predicts subway congestion, estimates wait times, and recommends "
        "less-crowded stations using a trained Random Forest model."
    ),
    version="1.0.0",
)

# ── CORS (environment-configurable — FIX-06) ─────────────────────────
# Development: allow localhost:3000 (Next.js dev server)
# Production : set ALLOWED_ORIGINS=https://your-domain.com in environment
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
_ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(prediction.router)
app.include_router(recommendation.router)
app.include_router(wait_time.router)
app.include_router(analytics.router)
app.include_router(stations.router)


# ── Global Exception Handler (FIX-05) ────────────────────────────────
_exc_logger = _logging.getLogger("smartqueue.exceptions")

@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log full detail server-side; never expose internals to the client
    _exc_logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ── Dev Server ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
