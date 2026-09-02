"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import SplashLoader from "@/app/components/SplashLoader";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, loading, logout, theme, toggleTheme } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isDesktop, setIsDesktop] = React.useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      if (user.role_name === "Admin") {
        router.push("/admin");
      } else if (!user.is_onboarded) {
        router.push("/onboarding");
      } else if (user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <SplashLoader />;
  }

  // Navigation items config
  const navItems = [
    {
      name: "AI Teacher Studio",
      href: "/student/ai-teacher",
      badge: "FLAGSHIP",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    },
    {
      name: "Overview",
      href: "/student/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      name: "Courses",
      href: "/student/courses",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      name: "UiPath Path",
      href: "/student/uipath",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      name: "Certificates",
      href: "/student/certificates",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      name: "Leaderboard",
      href: "/student/leaderboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      name: "AI Tutor Chat",
      href: "/student/chat",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      name: "Settings",
      href: "/student/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6EE] text-[#1E1E1E] dark:bg-zinc-950 dark:text-white transition-colors duration-200">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-zinc-900 border-b-2 md:border-b-0 md:border-r-2 border-black dark:border-zinc-800 p-4 md:p-6 flex flex-col justify-between z-40">
        <div>
          {/* Header */}
          <div className="mb-6 md:mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold font-handwriting text-[#E75A3D]">
              N.O.V.A.
            </h1>
            <p className="text-xs md:text-sm font-casual uppercase tracking-wider text-zinc-400">
              Student Workspace
            </p>
          </div>
 
          {/* User profile card */}
          <div className="sketch-card p-4 mb-6 bg-zinc-50 dark:bg-zinc-800/40 border-2 border-black dark:border-zinc-700 rounded-lg">
            <div className="font-handwriting text-lg leading-tight font-bold">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm font-casual mt-1 text-zinc-500 dark:text-zinc-400">
              {user.email}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-casual font-bold">
              <span className="bg-[#FEF08A] dark:bg-yellow-950 text-black dark:text-yellow-200 px-2 py-0.5 border border-black rounded">
                STUDENT
              </span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 py-2 px-3 rounded-md border-2 transition-all font-handwriting text-base font-bold ${
                    isActive
                      ? "bg-[#E75A3D] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]"
                      : "bg-transparent border-transparent hover:border-black dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
 
        {/* Footer controls inside sidebar */}
        <div className="mt-6 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-black dark:border-zinc-700 rounded-md font-handwriting text-sm bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 border-rose-300 dark:border-rose-900/50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen relative">
        {children}

        {/* Global Persistent Floating AI Educator Assistant Widget */}
        <FloatingAITeacherWidget />
      </main>
    </div>
  );
}

function FloatingAITeacherWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [response, setResponse] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAskQuickDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/v1/ai-teacher/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({
          title: `Quick Doubt: ${query.slice(0, 40)}`,
          student_level: "Class 10",
          language: "Hinglish",
          available_time_mins: 5,
          learning_goal: query
        })
      });
      if (res.ok) {
        const sessionData = await res.json();
        const nextRes = await fetch(`/api/v1/ai-teacher/sessions/${sessionData.id}/next`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`
          }
        });
        if (nextRes.ok) {
          const stepData = await nextRes.json();
          setResponse(stepData.teacher_script);
        }
      }
    } catch (err) {
      console.error("Quick doubt failed:", err);
      setResponse("Let's jump into the full AI Teacher Studio to explore this step-by-step!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#E75A3D] hover:bg-[#d44c30] text-white p-3.5 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold font-handwriting text-sm"
          title="Instant AI Educator Assistant (Alt + T)"
        >
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          <span className="hidden sm:inline">Ask AI Teacher</span>
          <span className="bg-black/40 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-mono">Alt+T</span>
        </button>
      </div>

      {/* Floating Educator Popover Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E75A3D] animate-pulse" />
              <h4 className="font-bold text-sm font-handwriting text-black dark:text-white">Dr. Nova — Instant Educator</h4>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-black dark:hover:text-white text-sm font-bold">
              ✕
            </button>
          </div>

          <p className="text-xs font-casual text-zinc-600 dark:text-zinc-400">
            Stuck on something on this page? Ask a quick doubt or jump to the studio session.
          </p>

          <form onSubmit={handleAskQuickDoubt} className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Why does current decrease when resistance increases?"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-xl p-3 text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E75A3D] font-casual"
            />

            <div className="flex items-center justify-between">
              <Link
                href="/student/ai-teacher"
                onClick={() => setIsOpen(false)}
                className="text-xs text-[#E75A3D] hover:underline font-bold font-casual"
              >
                Open Studio Workspace ➔
              </Link>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-[#E75A3D] hover:bg-[#d44c30] text-white font-handwriting font-bold text-sm px-4 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
              >
                {loading ? "Explaining..." : "Explain Doubt"}
              </button>
            </div>
          </form>

          {response && (
            <div className="bg-[#FEF08A]/30 dark:bg-zinc-950 border-2 border-black rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 max-h-48 overflow-y-auto leading-relaxed shadow-inner font-casual">
              <span className="text-[#E75A3D] font-bold block mb-1 font-handwriting text-sm">💡 Teacher Explanation:</span>
              <p>{response}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
