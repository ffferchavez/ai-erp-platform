"""
OpenAI chat client for generating answers from context.
"""
import os
import time
import logging
from typing import List, Optional
from app.openai_client import get_openai_client

logger = logging.getLogger(__name__)

_chat_model: str = os.getenv("CHAT_MODEL", "gpt-4o-mini")
_chat_max_tokens: int = int(os.getenv("CHAT_MAX_TOKENS", "250"))


def get_chat_model() -> str:
    """Get the chat model name."""
    return _chat_model


def get_chat_max_tokens() -> int:
    """Get the max tokens for chat responses."""
    return _chat_max_tokens


async def generate_answer(
    message: str,
    contexts: List[str],
    model: str | None = None,
    max_tokens: int | None = None,
    tenant_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> str:
    """
    Generate an answer from the given message and contexts.
    
    Args:
        message: User's question/message
        contexts: List of context strings (retrieved chunks)
        model: Chat model to use (defaults to CHAT_MODEL env var)
        max_tokens: Maximum tokens for response (defaults to CHAT_MAX_TOKENS env var)
        tenant_id: Tenant ID for logging (optional)
        request_id: Request ID for logging (optional)
        
    Returns:
        Generated answer string
        
    Raises:
        ValueError: If OPENAI_API_KEY is not set
    """
    if not contexts:
        return "I don't have enough information to answer that."
    
    client = get_openai_client()
    model = model or _chat_model
    max_tokens = max_tokens or _chat_max_tokens
    start_time = time.time()
    success = False
    error_type = None
    
    try:
        # Build context from retrieved chunks
        context_text = "\n\n".join([
            f"[Context {i+1}]\n{ctx}" for i, ctx in enumerate(contexts)
        ])
        
        # Minimal prompt that forces answer only from context
        system_prompt = """You are a helpful assistant that answers questions strictly based on the provided context.
Answer only using information from the context. If the context doesn't contain enough information, say "I don't have enough information to answer that."
Keep your answer concise and focused."""
        
        user_prompt = f"""Context:
{context_text}

Question: {message}

Answer:"""
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.3  # Lower temperature for more focused answers
        )
        
        answer = response.choices[0].message.content.strip()
        success = True
        return answer
    except Exception as e:
        error_type = type(e).__name__
        raise
    finally:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "openai_chat",
            extra={
                "event": "openai_chat",
                "tenant_id": tenant_id or "unknown",
                "model": model,
                "duration_ms": duration_ms,
                "success": success,
                "error_type": error_type,
                "request_id": request_id,
                "context_count": len(contexts)
            }
        )
