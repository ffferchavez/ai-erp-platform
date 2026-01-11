"""
Postgres schema creation and management.
Lightweight schema initialization without Alembic.
"""
import uuid
from sqlalchemy import text
from app.database import get_engine


async def ensure_schema_exists():
    """
    Create Postgres tables if they don't exist.
    Runs on startup to ensure schema is initialized.
    """
    engine = get_engine()
    
    async with engine.begin() as conn:
        # Create documents table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        
        # Create chunks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                chunk_index INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(document_id, chunk_index)
            )
        """))
        
        # Create indexes for faster lookups
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chunks_document_id 
            ON chunks(document_id)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index 
            ON chunks(chunk_index)
        """))