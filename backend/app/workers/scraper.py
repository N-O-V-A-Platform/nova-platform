"""
N.O.V.A. UiPath Content Scraper Worker

Silently scrapes publicly available UiPath documentation and community
content on a weekly schedule, chunks and embeds the text, and upserts
it into Pinecone under the "uipath_global" namespace.

All sources are publicly accessible — no login or ToS violation.

Schedule: Every Sunday at 02:00 (configured in main.py via APScheduler)
Manual trigger: POST /api/v1/admin/scrape/trigger
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.ai.document_processor import DocumentProcessor
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import PineconeVectorStore
from app.models.scrape import ScrapedSource

logger = logging.getLogger("nova.scraper")

# ─── Pinecone namespace for all scraped UiPath content ───────────────────────
UIPATH_NAMESPACE = "uipath_global"

# ─── Curated list of publicly available UiPath pages to scrape ───────────────
# Format: {"url": str, "title": str}
# Add/remove entries here to change what gets indexed.
UIPATH_SOURCES: List[Dict[str, str]] = [
    # ── UiPath Studio ─────────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/introduction", "title": "UiPath Studio - Introduction"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-automation-projects", "title": "About Automation Projects"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/workflow-design", "title": "Workflow Design"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/sequences", "title": "Sequences"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/flowcharts", "title": "Flowcharts"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/state-machines", "title": "State Machines"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/variables", "title": "Variables in UiPath"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/arguments", "title": "Arguments in UiPath"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/selectors", "title": "Selectors"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-debugging", "title": "Debugging in UiPath Studio"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/keyboard-shortcuts", "title": "UiPath Studio Keyboard Shortcuts"},

    # ── UiPath Orchestrator ───────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/introduction", "title": "Orchestrator - Introduction"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions", "title": "Queues and Transactions"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/managing-processes", "title": "Managing Processes"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs", "title": "About Jobs"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-triggers", "title": "About Triggers"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots", "title": "About Robots"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/assets", "title": "Assets in Orchestrator"},

    # ── UiPath Robot ──────────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/robot/standalone/2023.10/user-guide/introduction", "title": "UiPath Robot - Introduction"},
    {"url": "https://docs.uipath.com/robot/standalone/2023.10/user-guide/attended-vs-unattended", "title": "Attended vs Unattended Robots"},

    # ── UiPath Activities ─────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/activities/other/latest/ui-automation/about-ui-automation", "title": "About UI Automation"},
    {"url": "https://docs.uipath.com/activities/other/latest/productivity/about-mail-activities", "title": "Mail Activities"},
    {"url": "https://docs.uipath.com/activities/other/latest/system/about-file-management-activities", "title": "File Management Activities"},

    # ── RPA Concepts ──────────────────────────────────────────────────────────
    {"url": "https://www.uipath.com/rpa/what-is-rpa", "title": "What is RPA?"},
    {"url": "https://www.uipath.com/rpa/robotic-process-automation", "title": "Robotic Process Automation Overview"},

    # ── Robotic Enterprise Framework (REFramework) ────────────────────────────
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/robotic-enterprise-framework", "title": "Robotic Enterprise Framework (REFramework)"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-studiox", "title": "UiPath StudioX Overview"},
]


class ScrapeWorker:
    """
    Weekly UiPath content scraper.
    Fetches public documentation pages, extracts clean text,
    and indexes them into Pinecone for the AI Tutor to use.
    """

    def __init__(self):
        self.doc_processor = DocumentProcessor()
        self.embedding_service = EmbeddingService()
        self.vector_store = PineconeVectorStore()
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    async def scrape_url(self, url: str) -> Optional[str]:
        """
        Fetch a URL and extract clean human-readable text from the page body.
        Returns None on failure.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; NOVABot/1.0; Educational AI Platform)",
            "Accept": "text/html,application/xhtml+xml",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, "lxml")

            # Remove navigation, headers, footers, scripts, and ads
            for tag in soup(["nav", "header", "footer", "script", "style",
                              "aside", "form", ".sidebar", ".toc", ".breadcrumb"]):
                tag.decompose()

            # Prefer main content areas
            main = (
                soup.find("main")
                or soup.find("article")
                or soup.find(class_="content")
                or soup.find(id="content")
                or soup.find("body")
            )

            if not main:
                return None

            text = main.get_text(separator=" ", strip=True)
            # Collapse whitespace
            import re
            text = re.sub(r"\s{3,}", "\n\n", text).strip()

            return text if len(text) > 200 else None

        except Exception as e:
            logger.warning(f"[Scraper] Failed to fetch {url}: {e}")
            return None

    async def _process_source(
        self,
        source: Dict[str, str],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Scrape one URL, chunk → embed → upsert, and record the result.
        Returns a result dict with status and chunk_count.
        """
        url = source["url"]
        title = source["title"]

        # Deterministic source ID from URL hash
        source_id = hashlib.md5(url.encode()).hexdigest()

        try:
            # 1. Fetch page text
            text = await self.scrape_url(url)
            if not text:
                return {"url": url, "status": "error", "error": "Empty or failed to fetch"}

            # 2. Chunk the text
            chunks = DocumentProcessor.chunk_text(text, chunk_size=800, chunk_overlap=150)
            if not chunks:
                return {"url": url, "status": "error", "error": "No chunks extracted"}

            chunk_texts = [c["text"] for c in chunks]

            # 3. Batch embed
            embeddings = await self.embedding_service.get_embeddings_batch(chunk_texts)

            # 4. Upsert into Pinecone
            # Use source_id prefix so we can delete/replace on re-scrape
            pinecone_vectors = []
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                pinecone_vectors.append({
                    "id": f"{source_id}_{i}",
                    "values": emb,
                    "metadata": {
                        "source_url": url,
                        "title": title,
                        "text": chunk["text"],
                        "chunk_index": i,
                    }
                })

            # Directly upsert to Pinecone (bypassing resource FK requirements)
            if self.vector_store.pc:
                index = self.vector_store._get_index(self.vector_store.dimension)
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: index.upsert(vectors=pinecone_vectors, namespace=UIPATH_NAMESPACE)
                )

            # 5. Upsert ScrapedSource record
            result_obj = await db.execute(
                select(ScrapedSource).where(ScrapedSource.url == url)
            )
            record = result_obj.scalars().first()
            now = datetime.now(timezone.utc)

            if record:
                record.title = title
                record.chunk_count = len(chunks)
                record.status = "success"
                record.error_message = None
                record.last_scraped_at = now
            else:
                record = ScrapedSource(
                    url=url,
                    title=title,
                    namespace=UIPATH_NAMESPACE,
                    chunk_count=len(chunks),
                    status="success",
                    last_scraped_at=now,
                )
                db.add(record)

            await db.commit()

            logger.info(f"[Scraper] ✓ {title} — {len(chunks)} chunks indexed")
            return {"url": url, "status": "success", "chunk_count": len(chunks)}

        except Exception as e:
            logger.error(f"[Scraper] ✗ {url}: {e}")

            # Record error in DB
            try:
                result_obj = await db.execute(
                    select(ScrapedSource).where(ScrapedSource.url == url)
                )
                record = result_obj.scalars().first()
                if record:
                    record.status = "error"
                    record.error_message = str(e)
                else:
                    db.add(ScrapedSource(
                        url=url,
                        title=title,
                        namespace=UIPATH_NAMESPACE,
                        status="error",
                        error_message=str(e),
                    ))
                await db.commit()
            except Exception:
                pass

            return {"url": url, "status": "error", "error": str(e)}

    async def run_full_scrape(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Run a full scrape of all UIPATH_SOURCES.
        Called by APScheduler weekly and by the admin manual trigger endpoint.
        """
        if self._running:
            logger.warning("[Scraper] Scrape already in progress — skipping.")
            return {"status": "already_running"}

        self._running = True
        logger.info(f"[Scraper] Starting full UiPath content scrape ({len(UIPATH_SOURCES)} sources)")

        results = []
        success_count = 0
        error_count = 0

        for source in UIPATH_SOURCES:
            result = await self._process_source(source, db)
            results.append(result)
            if result["status"] == "success":
                success_count += 1
            else:
                error_count += 1
            # Small delay between requests to be polite
            await asyncio.sleep(1.5)

        self._running = False
        logger.info(
            f"[Scraper] Scrape complete — {success_count} success, {error_count} errors"
        )

        return {
            "status": "complete",
            "total_sources": len(UIPATH_SOURCES),
            "success": success_count,
            "errors": error_count,
            "results": results,
        }


# Module-level singleton used by both APScheduler and the admin endpoint
scrape_worker = ScrapeWorker()
