from fastapi import FastAPI

app = FastAPI(
    title="N.O.V.A API",
    version="1.0.0",
    description="Next-generation Operational Virtual Academic Assistant"
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to N.O.V.A API"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "nova-backend",
        "version": "1.0.0"
    }