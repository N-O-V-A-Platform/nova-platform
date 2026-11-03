import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.workers.scraper import ScrapeWorker, UIPATH_SOURCES
from app.models.scrape import ScrapedSource


@pytest.mark.asyncio
async def test_scraper_clean_html_extraction():
    worker = ScrapeWorker()

    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Test Guide — N.O.V.A Platform</title>
            <style>body { font-family: sans-serif; }</style>
            <script>console.log("ignore me");</script>
        </head>
        <body>
            <header><nav><a href="/">Home</a></nav></header>
            <main>
                <h1>Introduction to Distributed Multi-Agent Architectures</h1>
                <p>
                    Autonomous agents collaborate in a decentralized mesh to provide real-time
                    academic instruction, personalized pedagogical loops, and intelligent knowledge retrieval.
                    This paragraph contains comprehensive content that meets the length requirement.
                </p>
                <div class="sidebar">Sidebar ad text to remove</div>
            </main>
            <footer>Copyright 2026</footer>
        </body>
    </html>
    """

    mock_resp = MagicMock()
    mock_resp.text = html_content
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        with patch.object(worker, "_is_allowed_by_robots", return_value=True):
            result = await worker.scrape_url("https://example.com/test-doc")

            assert result is not None
            text, title = result
            assert "Distributed Multi-Agent" in text
            assert "Sidebar ad" not in text
            assert "console.log" not in text
            assert title == "Test Guide — N.O.V.A Platform"


@pytest.mark.asyncio
async def test_scraper_robots_txt_resilience():
    worker = ScrapeWorker()

    # Verify that invalid URLs return False safely
    assert await worker._is_allowed_by_robots("") is False

    # Mock robots.txt with network timeout - should gracefully allow rate-limited crawl rather than throwing
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connect timeout")):
        allowed = await worker._is_allowed_by_robots("https://docs.resilient-test.edu/intro")
        assert allowed is True


@pytest.mark.asyncio
async def test_scrape_single_url_flow(db_session):
    worker = ScrapeWorker()

    test_url = "https://mock-knowledge.edu/course-101"
    sample_text = (
        "Course Overview: Data Structures & Algorithms. "
        "Understanding dynamic programming, memoization, tree traversals, "
        "and computational graph complexity." * 6
    )

    with patch.object(worker, "scrape_url", return_value=(sample_text, "Data Structures 101")):
        with patch.object(worker.embedding_service, "get_embeddings_batch", new_callable=AsyncMock) as mock_emb:
            mock_emb.return_value = [[0.05] * 384] * 5
            
            result = await worker.scrape_single_url(
                url=test_url,
                title="Data Structures 101",
                db=db_session,
                product="Algorithms"
            )

            assert result["status"] in ("success", "skipped")
            assert result["url"] == test_url
            if result["status"] == "success":
                assert result["chunk_count"] > 0
