"""
N.O.V.A. UiPath Content Ingestion Worker

Performs targeted indexing of publicly available UiPath documentation on a weekly schedule,
chunking and embedding the text for search, and upserting it into Pinecone under the 
"uipath_global" namespace.

Note: Respects robots.txt compliance and rate limiting (politeness delays). Always verify
content reproduction terms before public deployment.

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
from app.core.config import settings

logger = logging.getLogger("nova.scraper")

# ─── Pinecone namespace for all scraped UiPath content ───────────────────────
UIPATH_NAMESPACE = "uipath_global"

# ─── Curated list of publicly available UiPath pages to scrape ───────────────
# Format: {"url": str, "title": str}
# Add/remove entries here to change what gets indexed.
UIPATH_SOURCES: List[Dict[str, str]] = [
    # ── UiPath Studio ─────────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/introduction", "title": "UiPath Studio - Introduction", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-automation-projects", "title": "About Automation Projects", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/workflow-design", "title": "Workflow Design", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/sequences", "title": "Sequences", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/flowcharts", "title": "Flowcharts", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/state-machines", "title": "State Machines", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/variables", "title": "Variables in UiPath", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/arguments", "title": "Arguments in UiPath", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/selectors", "title": "Selectors", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-debugging", "title": "Debugging in UiPath Studio", "product": "Studio", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/keyboard-shortcuts", "title": "UiPath Studio Keyboard Shortcuts", "product": "Studio", "version": "2023.10"},

    # ── UiPath Orchestrator ───────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/introduction", "title": "Orchestrator - Introduction", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions", "title": "Queues and Transactions", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/managing-processes", "title": "Managing Processes", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs", "title": "About Jobs", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-triggers", "title": "About Triggers", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots", "title": "About Robots", "product": "Orchestrator", "version": "Latest"},
    {"url": "https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/assets", "title": "Assets in Orchestrator", "product": "Orchestrator", "version": "Latest"},

    # ── UiPath Robot ──────────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/robot/standalone/2023.10/user-guide/introduction", "title": "UiPath Robot - Introduction", "product": "Robot", "version": "2023.10"},
    {"url": "https://docs.uipath.com/robot/standalone/2023.10/user-guide/attended-vs-unattended", "title": "Attended vs Unattended Robots", "product": "Robot", "version": "2023.10"},

    # ── UiPath Activities ─────────────────────────────────────────────────────
    {"url": "https://docs.uipath.com/activities/other/latest/ui-automation/about-ui-automation", "title": "About UI Automation", "product": "Activities", "version": "Latest"},
    {"url": "https://docs.uipath.com/activities/other/latest/productivity/about-mail-activities", "title": "Mail Activities", "product": "Activities", "version": "Latest"},
    {"url": "https://docs.uipath.com/activities/other/latest/system/about-file-management-activities", "title": "File Management Activities", "product": "Activities", "version": "Latest"},

    # ── RPA Concepts ──────────────────────────────────────────────────────────
    {"url": "https://www.uipath.com/rpa/what-is-rpa", "title": "What is RPA?", "product": "UiPath RPA", "version": "Latest"},
    {"url": "https://www.uipath.com/rpa/robotic-process-automation", "title": "Robotic Process Automation Overview", "product": "UiPath RPA", "version": "Latest"},

    # ── Robotic Enterprise Framework (REFramework) ────────────────────────────
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/robotic-enterprise-framework", "title": "Robotic Enterprise Framework (REFramework)", "product": "REFramework", "version": "2023.10"},
    {"url": "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-studiox", "title": "UiPath StudioX Overview", "product": "StudioX", "version": "2023.10"},
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
        self._robot_parsers = {}

    @property
    def is_running(self) -> bool:
        return self._running

    async def _is_allowed_by_robots(self, url: str) -> bool:
        """
        Check robots.txt of the domain to verify if scraping is allowed.
        Caches RobotFileParser instances to minimize HTTP requests.
        If robots.txt is unavailable (except standard 404), defaults to disallowing.
        """
        from urllib.robotparser import RobotFileParser
        from urllib.parse import urlparse

        parsed_url = urlparse(url)
        netloc = parsed_url.netloc
        scheme = parsed_url.scheme

        if not netloc or not scheme:
            logger.warning(f"[Scraper] Invalid URL: {url}")
            return False

        if netloc not in self._robot_parsers:
            robots_url = f"{scheme}://{netloc}/robots.txt"
            rp = RobotFileParser()
            try:
                headers = {"User-Agent": "Mozilla/5.0 (compatible; NOVABot/1.0; Educational AI Platform)"}
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    response = await client.get(robots_url, headers=headers)
                if response.status_code == 200:
                    rp.parse(response.text.splitlines())
                    self._robot_parsers[netloc] = (rp, True)
                elif response.status_code == 404:
                    # 404 means no robots.txt, standard robot rules imply allowed
                    rp.parse([])
                    self._robot_parsers[netloc] = (rp, True)
                else:
                    logger.warning(f"[Scraper] robots.txt returned status {response.status_code} for {netloc}. Disallowing crawls for safety.")
                    self._robot_parsers[netloc] = (None, False)
            except Exception as e:
                logger.warning(f"[Scraper] Failed to fetch robots.txt for {netloc}: {e}. Disallowing crawls for safety.")
                self._robot_parsers[netloc] = (None, False)

        parser, available = self._robot_parsers[netloc]
        if not available:
            return False

        return parser.can_fetch("NOVABot", url)

    async def scrape_url(self, url: str) -> Optional[str]:
        """
        Fetch a URL and extract clean human-readable text from the page body.
        Returns None on failure.
        """
        if not await self._is_allowed_by_robots(url):
            logger.warning(f"[Scraper] Disallowed by robots.txt for URL: {url}")
            return None

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
        Avoids embedding and writing unchanged pages using content hashing.
        """
        url = source["url"]
        title = source["title"]
        product = source.get("product", "UiPath")
        version = source.get("version", "Latest")
        source_id = hashlib.md5(url.encode()).hexdigest()

        # Query existing record first to get the previous chunk count and content hash
        result_obj = await db.execute(
            select(ScrapedSource).where(ScrapedSource.url == url)
        )
        record = result_obj.scalars().first()

        try:
            # 1. Fetch page text
            text = await self.scrape_url(url)
            if not text:
                return {"url": url, "status": "error", "error": "Empty, failed to fetch, or disallowed by robots.txt"}

            # Calculate content hash to determine if we can skip embedding
            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

            # 2. Check if content has changed
            if record and record.status == "success" and record.content_hash == content_hash:
                logger.info(f"[Scraper] ➔ {title} unchanged. Skipping chunking and embedding.")
                record.last_scraped_at = datetime.now(timezone.utc)
                await db.commit()
                return {"url": url, "status": "skipped", "chunk_count": record.chunk_count}

            # 3. Chunk the text
            chunks = DocumentProcessor.chunk_text(text, chunk_size=800, chunk_overlap=150)
            if not chunks:
                return {"url": url, "status": "error", "error": "No chunks extracted"}

            chunk_texts = [c["text"] for c in chunks]

            # 4. Batch embed
            embeddings = await self.embedding_service.get_embeddings_batch(chunk_texts)

            # 5. Upsert into Pinecone
            pinecone_vectors = []
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                pinecone_vectors.append({
                    "id": f"{source_id}_{i}",
                    "values": emb,
                    "metadata": {
                        "source_url": url,
                        "title": title,
                        "product": product,
                        "version": version,
                        "text": chunk["text"],
                        "chunk_index": i,
                        "embedding_model": self.embedding_service.model_name,
                        "embedding_dimension": settings.EMBEDDING_DIMENSION,
                    }
                })

            # Directly upsert to Pinecone (bypassing resource FK requirements)
            if self.vector_store.pc:
                index = self.vector_store._get_index(self.vector_store.dimension)
                loop = asyncio.get_event_loop()

                # Upsert new vectors first
                await loop.run_in_executor(
                    None,
                    lambda: index.upsert(vectors=pinecone_vectors, namespace=UIPATH_NAMESPACE)
                )

                # Clean up excess old vectors AFTER the new ones are successfully upserted
                # This ensures we don't leave orphaned chunks if chunk count decreased
                if record and record.chunk_count > len(chunks):
                    excess_ids = [f"{source_id}_{i}" for i in range(len(chunks), record.chunk_count)]
                    try:
                        await loop.run_in_executor(
                            None,
                            lambda: index.delete(ids=excess_ids, namespace=UIPATH_NAMESPACE)
                        )
                    except Exception as de:
                        logger.warning(f"[Scraper] Failed to delete excess old vectors for {url}: {de}")

            # 6. Upsert ScrapedSource record
            now = datetime.now(timezone.utc)

            if record:
                record.title = title
                record.chunk_count = len(chunks)
                record.status = "success"
                record.error_message = None
                record.content_hash = content_hash
                record.embedding_model = self.embedding_service.model_name
                record.embedding_dimension = settings.EMBEDDING_DIMENSION
                record.last_scraped_at = now
            else:
                record = ScrapedSource(
                    url=url,
                    title=title,
                    namespace=UIPATH_NAMESPACE,
                    chunk_count=len(chunks),
                    status="success",
                    content_hash=content_hash,
                    embedding_model=self.embedding_service.model_name,
                    embedding_dimension=settings.EMBEDDING_DIMENSION,
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
        skipped_count = 0
        error_count = 0

        for source in UIPATH_SOURCES:
            result = await self._process_source(source, db)
            results.append(result)
            if result["status"] == "success":
                success_count += 1
            elif result["status"] == "skipped":
                skipped_count += 1
            else:
                error_count += 1
            # Small delay between requests to be polite
            await asyncio.sleep(1.5)

        self._running = False
        logger.info(
            f"[Scraper] Scrape complete — {success_count} success, {skipped_count} skipped, {error_count} errors"
        )

        return {
            "status": "complete",
            "total_sources": len(UIPATH_SOURCES),
            "success": success_count,
            "skipped": skipped_count,
            "errors": error_count,
            "results": results,
        }


# Module-level singleton used by both APScheduler and the admin endpoint
scrape_worker = ScrapeWorker()
