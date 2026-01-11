from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from app.database import check_postgres
from app.qdrant_client import check_qdrant

app = FastAPI(title="AI API", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    """
    Readiness check endpoint.
    Verifies connectivity to Postgres and Qdrant.
    Returns 200 if both are healthy, 503 if either fails.
    """
    postgres_ok, postgres_error = await check_postgres()
    qdrant_ok, qdrant_error = check_qdrant()

    if postgres_ok and qdrant_ok:
        return {"status": "ready", "postgres": "ok", "qdrant": "ok"}

    errors = {}
    if not postgres_ok:
        errors["postgres"] = postgres_error
    if not qdrant_ok:
        errors["qdrant"] = qdrant_error

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not ready",
            "errors": errors
        }
    )


@app.get("/")
async def root():
    return {"name": "ai-api", "version": "0.1.0"}
