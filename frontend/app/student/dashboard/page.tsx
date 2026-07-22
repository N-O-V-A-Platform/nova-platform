"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import Link from "next/link";

export default function StudentDashboardOverview() {
  const { user } = useAuth();
  const router = useRouter();

  const [showStickyNote, setShowStickyNote] = useState(true);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [uipathJourney, setUipathJourney] = useState<any>(null);
  const [studyTip, setStudyTip] = useState("");

  // Notepad state: dynamic notebook
  const [pages, setPages] = useState<string[]>(["", "", ""]);
  const [activePage, setActivePage] = useState(0);

  // Load notepad pages from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPages = localStorage.getItem("nova_notepad_pages");
      if (savedPages) {
        try {
          setPages(JSON.parse(savedPages));
        } catch (e) {
          console.error("Error reading notepad pages", e);
        }
      }
    }
  }, []);

  const handlePageTextChange = (text: string) => {
    const updated = [...pages];
    updated[activePage] = text;
    setPages(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_notepad_pages", JSON.stringify(updated));
    }
  };

  const nextPage = () => {
    if (activePage < pages.length - 1) {
      setActivePage(activePage + 1);
    } else {
      const updated = [...pages, ""];
      setPages(updated);
      setActivePage(activePage + 1);
      if (typeof window !== "undefined") {
        localStorage.setItem("nova_notepad_pages", JSON.stringify(updated));
      }
    }
  };

  const prevPage = () => {
    if (activePage > 0) {
      setActivePage(activePage - 1);
    }
  };

  const deletePage = () => {
    if (pages.length <= 1) {
      // Clear current page instead of deleting the last page
      handlePageTextChange("");
      return;
    }
    const updated = pages.filter((_, idx) => idx !== activePage);
    setPages(updated);
    const newActive = activePage >= updated.length ? updated.length - 1 : activePage;
    setActivePage(newActive);
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_notepad_pages", JSON.stringify(updated));
    }
  };

  // Fetch announcements from backend
  const fetchAnnouncements = async () => {
    try {
      const data = await authService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setAnnouncements([
        "Welcome to N.O.V.A! Your AI assistant is fully grounded in your slides.",
        "Stay curious and keep exploring your courses!"
      ]);
    }
  };

  // Fetch UiPath Academy Study Journey details
  const fetchUiPathData = async () => {
    try {
      const journeyData = await authService.getUiPathJourney();
      setUipathJourney(journeyData);
    } catch (err) {
      console.error("Failed to load UiPath data:", err);
    }
  };

  // Fetch dynamic AI Study Tip
  const fetchStudyTip = async () => {
    try {
      const res = await authService.getStudyTip();
      setStudyTip(res.tip);
    } catch (err) {
      console.error("Failed to load study tip:", err);
      setStudyTip("Break your study sessions into 25-minute blocks using the Pomodoro technique to stay focused.");
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchUiPathData();
      fetchStudyTip();
    }
  }, [user]);

  const xpCount = uipathJourney ? uipathJourney.completed_count * 200 : 0;
  const currentRank = uipathJourney && uipathJourney.completed_count > 0 
    ? `#${Math.max(1, 20 - uipathJourney.completed_count * 2)}` 
    : "Unranked";

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="sketch-card p-6 bg-gradient-to-r from-orange-50 to-orange-100/40 dark:from-zinc-900 dark:to-zinc-800/20 border-2 border-black dark:border-zinc-800 rounded-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D] mb-1.5">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-base font-casual text-zinc-600 dark:text-zinc-400">
            Keep up the excellent work. Here is your overview for today.
          </p>
        </div>
        <div className="absolute right-4 bottom-[-15px] text-zinc-300 dark:text-zinc-800 opacity-20 select-none hidden md:block">
          <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Stats and Announcements */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="sketch-card p-5 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-black dark:border-yellow-700/60 rounded-lg text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
              <div className="flex justify-center text-yellow-500 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="font-handwriting text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {xpCount} XP
              </div>
              <div className="text-sm font-casual text-zinc-500 uppercase tracking-wider mt-1.5">
                Total XP Earned
              </div>
            </div>

            <div className="sketch-card p-5 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-black dark:border-emerald-700/60 rounded-lg text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
              <div className="flex justify-center text-emerald-500 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.243.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.773-.568-.374-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="font-handwriting text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {currentRank}
              </div>
              <div className="text-sm font-casual text-zinc-500 uppercase tracking-wider mt-1.5">
                Leaderboard Rank
              </div>
            </div>
          </div>

          {/* Announcements Card */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold font-handwriting flex items-center gap-2.5">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Board Announcements</span>
              </h3>
            </div>
            <div className="space-y-4">
              {announcements.map((ann, idx) => (
                <div
                  key={idx}
                  className="p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-md font-casual text-base leading-relaxed bg-zinc-50/50 dark:bg-zinc-800/10"
                >
                  {ann}
                </div>
              ))}
            </div>
          </div>

          {/* Next Study Action Banner */}
          {uipathJourney?.recommended_course && (
            <div className="sketch-card p-5 bg-amber-50 dark:bg-zinc-900 border-2 border-yellow-500 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-yellow-600 dark:text-yellow-400 font-casual tracking-wider">
                  Recommended Track
                </span>
                <h4 className="text-xl font-bold font-handwriting leading-tight">
                  {uipathJourney.recommended_course.title}
                </h4>
                <p className="text-sm font-casual text-zinc-500 dark:text-zinc-400">
                  Earn {uipathJourney.recommended_course.xp} XP and a custom badge on completion.
                </p>
              </div>
              <Link
                href="/student/uipath"
                className="sketch-btn-primary py-2 px-5 font-handwriting text-base whitespace-nowrap shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                Go to Learning Path
              </Link>
            </div>
          )}
        </div>

        {/* Right column: Notepad & Sticky Note */}
        <div className="space-y-8">
          {/* Sticky Note widget */}
          {showStickyNote && (
            <div className="relative sketch-card p-5 bg-[#FEF08A] text-zinc-850 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] transition-all hover:rotate-0">
              <button
                onClick={() => setShowStickyNote(false)}
                className="absolute top-2 right-2 text-sm hover:text-red-500 font-bold p-1"
                title="Dismiss tip"
              >
                [x]
              </button>
              <h4 className="font-handwriting text-xl font-bold mb-2 flex items-center gap-2 text-zinc-900">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.6 19.6L12 12m0 0L4.4 4.4M12 12L4.4 19.6M12 12l7.6-7.6" />
                </svg>
                <span>AI Study Tip</span>
              </h4>
              <p className="font-casual text-sm leading-relaxed text-zinc-800">
                {studyTip || "Ask your AI Tutor Chat for help to quiz your understanding of the lecture slides."}
              </p>
            </div>
          )}

          {/* Notebook / Notepad widget */}
          <div className="sketch-card p-5 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-none flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="flex justify-between items-center mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-handwriting text-xl font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#E75A3D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>My Notepad</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-casual text-xs text-zinc-400">
                    Page {activePage + 1} of {pages.length}
                  </span>
                  <button
                    onClick={deletePage}
                    title="Delete current page"
                    className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <textarea
                value={pages[activePage]}
                onChange={(e) => handlePageTextChange(e.target.value)}
                placeholder="Write your class notes, ideas, or reminders here..."
                className="w-full h-44 bg-transparent border-0 outline-none resize-none font-casual text-lg md:text-xl leading-relaxed placeholder-zinc-450 dark:placeholder-zinc-500"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
              <button
                onClick={prevPage}
                disabled={activePage === 0}
                className="sketch-btn-secondary px-4.5 py-1.5 font-handwriting text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={nextPage}
                className="sketch-btn-secondary px-4.5 py-1.5 font-handwriting text-xs"
              >
                {activePage === pages.length - 1 ? "+ Add Page" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
