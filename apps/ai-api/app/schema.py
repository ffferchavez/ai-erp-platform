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
    Handles v0.6 tenant_id migration for existing tables.
    """
    from app.auth import get_default_tenant_id
    
    engine = get_engine()
    default_tenant = get_default_tenant_id()
    
    async with engine.begin() as conn:
        # Create documents table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id TEXT NOT NULL DEFAULT :default_tenant,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """), {"default_tenant": default_tenant})
        
        # Add tenant_id column if table exists but column doesn't (migration)
        # Use format to inject default value since DO blocks don't support parameters
        await conn.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'documents' AND column_name = 'tenant_id'
                ) THEN
                    ALTER TABLE documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '{default_tenant}';
                END IF;
            END $$;
        """))
        
        # Create chunks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                tenant_id TEXT NOT NULL DEFAULT :default_tenant,
                chunk_index INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(document_id, chunk_index)
            )
        """), {"default_tenant": default_tenant})
        
        # Add tenant_id column if table exists but column doesn't (migration)
        # Use format to inject default value since DO blocks don't support parameters
        await conn.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'chunks' AND column_name = 'tenant_id'
                ) THEN
                    ALTER TABLE chunks ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '{default_tenant}';
                END IF;
            END $$;
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
        
        # Create tenant_id indexes for v0.6
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_documents_tenant_created 
            ON documents(tenant_id, created_at)
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chunks_tenant_document 
            ON chunks(tenant_id, document_id)
        """))