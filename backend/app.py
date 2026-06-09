"""
Smart Queue AI — FastAPI Application.

Entry point for the REST API.  Run with:
    uvicorn app:app --reload --host 0.0.0.0 --port 8000

Swagger UI : http://localhost:8000/docs
ReDoc       : http://localhost:8000/redoc
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import health, prediction, recommendation, wait_time

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

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(prediction.router)
app.include_router(recommendation.router)
app.include_router(wait_time.router)


# ── Global Exception Handler ─────────────────────────────────────────
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
        },
    )


# ── Dev Server ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
