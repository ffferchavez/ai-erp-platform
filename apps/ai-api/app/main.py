from fastapi import FastAPI

app = FastAPI(title="AI API", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"name": "ai-api", "version": "0.1.0"}
