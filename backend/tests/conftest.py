import pytest
from app.db.session import get_db, engine

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def db_session():
    async for session in get_db():
        yield session

@pytest.fixture(autouse=True)
async def cleanup_connections():
    yield
    # Dispose of the engine to close all pool connections before anyio shuts down the loop
    await engine.dispose()
