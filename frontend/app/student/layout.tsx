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
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-black dark:border-zinc-700 rounded-md font-handwriting text-sm bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-none"
          >
            {theme === "light" ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                <span>Dark Board</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>Light Board</span>
              </>
            )}
          </button>
 
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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
