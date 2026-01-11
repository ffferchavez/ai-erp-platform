import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy import text

_database_url = os.getenv("DATABASE_URL", "")
_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    """Get or create the async database engine."""
    global _engine
    if _engine is None:
        if not _database_url:
            raise ValueError("DATABASE_URL environment variable is not set")
        # Convert postgresql:// to postgresql+asyncpg:// for async SQLAlchemy
        async_url = _database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        _engine = create_async_engine(async_url, echo=False)
    return _engine


async def check_postgres() -> tuple[bool, str]:
    """
    Check Postgres connectivity.
    Returns (is_healthy, error_message)
    """
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        return True, ""
    except Exception as e:
        return False, str(e)
