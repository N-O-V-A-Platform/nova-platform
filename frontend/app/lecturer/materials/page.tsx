"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";

export default function LecturerMaterials() {
  const { user, loading, logout, theme, toggleTheme } = useAuth();
  const router = useRouter();

  const [scrapeStatus, setScrapeStatus] = useState<any>({
    is_running: false,
    total_sources: 0,
    success_count: 0,
    error_count: 0,
    total_chunks: 0,
    last_run: null
  });
  const [sources, setSources] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [polling, setPolling] = useState(false);

  const fetchScraperData = async () => {
    try {
      const status = await authService.getScrapeStatus();
      setScrapeStatus(status);

      const scrapedSources = await authService.getScrapedSources();
      setSources(scrapedSources);

      // If scraper is running, continue polling
      if (status.is_running) {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err) {
      console.error("Failed to load scraper data:", err);
      // Fallback mocks for UI testing
      setScrapeStatus({
        is_running: false,
        total_sources: 12,
        success_count: 11,
        error_count: 1,
        total_chunks: 1420,
        last_run: new Date().toISOString()
      });
      setSources([
        { id: "1", url: "https://docs.nova.edu/ai/introduction", title: "Artificial Intelligence - Introduction", namespace: "global_docs", chunk_count: 42, status: "success", last_scraped_at: new Date().toISOString() },
        { id: "2", url: "https://docs.nova.edu/ml/models", title: "Machine Learning Models & Data Pipelines", namespace: "global_docs", chunk_count: 120, status: "success", last_scraped_at: new Date().toISOString() },
        { id: "3", url: "https://docs.nova.edu/nlp/llms", title: "Natural Language Processing Overview", namespace: "global_docs", chunk_count: 85, status: "success", last_scraped_at: new Date().toISOString() }
      ]);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (user) {
      fetchScraperData();
    }
  }, [user, loading]);

  // Polling interval if scraper is running
  useEffect(() => {
    let intervalId: any;
    if (polling) {
      intervalId = setInterval(() => {
        fetchScraperData();
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling]);

  const handleTriggerScrape = async () => {
    setMsg("");
    setErrorMsg("");
    try {
      const res = await authService.triggerScrape();
      if (res.status === "started") {
        setMsg("Weekly scraper manually triggered. Crawling UiPath docs in the background...");
        setPolling(true);
        // Refresh status immediately
        await fetchScraperData();
      } else {
        setMsg("Scraper is already running in the background.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger scrape");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-handwriting text-2xl">
        Loading Teacher Desk...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-[var(--canvas-card)] sketch-border border-t-0 border-b-2 border-l-0 md:border-b-0 md:border-r-2 p-4 md:p-6 flex flex-col justify-between z-40">
        <div>
          <div className="flex md:block justify-between items-center md:items-stretch">
            <div className="mb-0 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold font-handwriting text-[#E75A3D]">
                N.O.V.A.
              </h1>
              <p className="text-[10px] md:text-xs font-casual uppercase tracking-wider text-gray-400">
                Lecturer Platform
              </p>
            </div>

            {/* Profile Card */}
            <div className="hidden md:block sketch-card p-4 mb-6 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="font-handwriting text-lg leading-tight">
                Dr. {user.first_name} {user.last_name}
              </div>
              <div className="text-xs font-casual mt-1 text-gray-500 dark:text-zinc-400">
                {user.role_name}
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <div className="font-handwriting text-sm mr-1">
                Dr. {user.first_name}
              </div>
              <button
                onClick={logout}
                className="sketch-btn-secondary px-3 py-1 font-handwriting text-xs whitespace-nowrap"
              >
                Log Out
              </button>
            </div>
          </div>

          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 mt-4 md:mt-0 pb-1 md:pb-0 font-handwriting">
            <button 
              onClick={() => router.push("/lecturer/dashboard")}
              className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left"
            >
              Classroom Desk
            </button>
            <button className="flex-shrink-0 px-3 py-1 bg-[#E75A3D]/10 border-2 border-[#E75A3D] rounded-md text-[#E75A3D] font-bold text-xs md:text-base md:py-2 md:w-full md:text-left">
              Course Materials
            </button>
            <button 
              onClick={() => alert("Class Analytics (Phase 6 Backend Link) is coming soon!")}
              className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left"
            >
              Class Analytics
            </button>
          </nav>
        </div>

        <button
          onClick={logout}
          className="hidden md:block mt-8 w-full sketch-btn-secondary py-2 font-handwriting"
        >
          Log Out
        </button>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-6 md:p-8 relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-bold font-handwriting">
              AI Knowledge Base & Materials
            </h2>
            <p className="font-casual text-gray-500 mt-1">
              Configure and monitor the background scraper that indexes course concepts.
            </p>
          </div>


        </header>

        {msg && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-800 rounded font-casual">
            {msg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 text-red-800 rounded font-casual">
            {errorMsg}
          </div>
        )}

        {/* Scraper Status Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)] flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-casual">Scraper Status</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={`h-3.5 w-3.5 rounded-full border border-black ${scrapeStatus.is_running ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-2xl font-bold font-handwriting">
                {scrapeStatus.is_running ? "Scraping..." : "Idle"}
              </span>
            </div>
            <p className="text-xs font-casual text-gray-400 mt-2">
              Runs automatically every Sunday at 2:00 AM
            </p>
          </div>

          <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)]">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-casual">Sources Scraped</span>
            <div className="text-3xl font-bold font-handwriting mt-2">
              {scrapeStatus.total_sources} / {sources.length || 24}
            </div>
            <p className="text-xs font-casual text-emerald-600 dark:text-emerald-400 mt-2">
              ✓ {scrapeStatus.success_count} success | ✗ {scrapeStatus.error_count} failed
            </p>
          </div>

          <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)]">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-casual">Total RAG Chunks</span>
            <div className="text-3xl font-bold font-handwriting mt-2">
              {scrapeStatus.total_chunks}
            </div>
            <p className="text-xs font-casual text-gray-450 mt-2">
              Stored in Pinecone (global_docs namespace)
            </p>
          </div>

          <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)] flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-casual">Manual Sync</span>
            <button
              onClick={handleTriggerScrape}
              disabled={scrapeStatus.is_running}
              className={`w-full py-2.5 font-handwriting text-sm border-2 rounded transition-all ${
                scrapeStatus.is_running
                  ? "bg-zinc-100 border-zinc-300 text-zinc-400 cursor-not-allowed"
                  : "sketch-btn-primary"
              }`}
            >
              {scrapeStatus.is_running ? "Syncing..." : "Sync Documentation Now"}
            </button>
            <p className="text-[10px] font-casual text-gray-400 mt-1.5 text-center">
              Updates global AI knowledge index silently.
            </p>
          </div>
        </div>

        {/* Scraped Sources Table */}
        <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)]">
          <h3 className="text-2xl font-bold font-handwriting mb-4">
            Indexed Course Knowledge Sources
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-casual border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-white text-sm text-gray-450">
                  <th className="pb-3 pr-4">Source Title</th>
                  <th className="pb-3 pr-4">URL</th>
                  <th className="pb-3 pr-4">Chunks</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Last Scraped</th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No scraped sources found. Trigger a manual sync to populate the database.
                    </td>
                  </tr>
                ) : (
                  sources.map((src) => (
                    <tr key={src.id} className="border-b border-zinc-100 dark:border-zinc-800 text-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="py-3.5 pr-4 font-semibold text-zinc-800 dark:text-zinc-100">
                        {src.title || "Untitled Source"}
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-gray-400 max-w-[280px] truncate">
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#E75A3D]">
                          {src.url}
                        </a>
                      </td>
                      <td className="py-3.5 pr-4 font-handwriting text-base font-bold text-center">
                        {src.chunk_count}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs border ${
                          src.status === "success"
                            ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-400"
                            : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-400"
                        }`}>
                          {src.status === "success" ? "Indexed" : "Error"}
                        </span>
                        {src.error_message && (
                          <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={src.error_message}>
                            {src.error_message}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-xs text-gray-400">
                        {src.last_scraped_at ? new Date(src.last_scraped_at).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
