"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";

export default function StudentDashboard() {
  const { user, loading, logout, theme, toggleTheme } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [showStickyNote, setShowStickyNote] = useState(true);
  const [enrollMsg, setEnrollMsg] = useState("");

  // Notepad state: 3-page notebook
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
    }
  };

  const prevPage = () => {
    if (activePage > 0) {
      setActivePage(activePage - 1);
    }
  };

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      const allCourses = await authService.getCourses();
      if (allCourses.length > 0) {
        setCourses(allCourses.slice(0, 2));
        setAvailableCourses(allCourses.slice(2));
      } else {
        // Fallbacks if db is empty
        const fallbackCourses = [
          { id: "1", title: "Introduction to Computer Science", code: "CS101", semester: 1, credits: 4, lecturer: { first_name: "Dr. Alan", last_name: "Turing" } },
          { id: "2", title: "Design & Analysis of Algorithms", code: "CS302", semester: 3, credits: 4, lecturer: { first_name: "Prof. Barbara", last_name: "Liskov" } }
        ];
        setCourses(fallbackCourses);
        setAvailableCourses([
          { id: "3", title: "Database Management Systems", code: "CS204", semester: 2, credits: 3, lecturer: { first_name: "Dr. Edgar", last_name: "Codd" } }
        ]);
      }
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchCourses();
    }
  }, [user, loading]);

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollMsg("");
      await authService.enrollCourse(courseId);
      setEnrollMsg("Enrolled successfully! Updating courses...");
      setTimeout(() => {
        fetchCourses();
        setEnrollMsg("");
      }, 1500);
    } catch (err: any) {
      setEnrollMsg(`Enrollment failed: ${err.message}`);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-handwriting text-2xl">
        Writing whiteboard contents...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar / Topbar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-[var(--canvas-card)] sketch-border border-t-0 border-b-2 border-l-0 md:border-b-0 md:border-r-2 p-4 md:p-6 flex flex-col justify-between z-40">
        <div>
          <div className="flex md:block justify-between items-center md:items-stretch">
            <div className="mb-0 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold font-handwriting text-[#E75A3D]">
                N.O.V.A.
              </h1>
              <p className="text-[10px] md:text-xs font-casual uppercase tracking-wider text-gray-400">
                Student Platform
              </p>
            </div>

            {/* Desktop Profile Card */}
            <div className="hidden md:block sketch-card p-4 mb-6 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="font-handwriting text-lg leading-tight">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs font-casual mt-1 text-gray-500 dark:text-zinc-400">
                {user.role_name}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-casual">
                <span className="bg-[#FEF08A] dark:bg-yellow-950 px-2 py-0.5 border border-black dark:border-white rounded">
                  XP: 1,240
                </span>
                <span className="bg-orange-100 dark:bg-orange-950 px-2 py-0.5 border border-black dark:border-white rounded">
                  Rank: #12
                </span>
              </div>
            </div>

            {/* Mobile Profile Card */}
            <div className="flex md:hidden items-center gap-3">
              <span className="text-xs bg-[#FEF08A] dark:bg-yellow-950 px-2 py-0.5 border border-black rounded font-casual">
                XP: 1.2k
              </span>
              <button
                onClick={logout}
                className="sketch-btn-secondary px-3 py-1 font-handwriting text-xs whitespace-nowrap"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Navigation links: scrollable horizontally on mobile, stacked vertically on desktop */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 mt-4 md:mt-0 pb-1 md:pb-0 font-handwriting">
            <button className="flex-shrink-0 px-3 py-1 bg-[#E75A3D]/10 border-2 border-[#E75A3D] rounded-md text-[#E75A3D] font-bold text-xs md:text-base md:py-2 md:w-full md:text-left">
              Dashboard
            </button>
            <button 
              onClick={() => alert("Learn Module (Phase 4 RAG chatbot) is coming soon!")}
              className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left"
            >
              Ask AI (RAG)
            </button>
            <button className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left">
              Skill Passport
            </button>
            <button className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left">
              Insights
            </button>
          </nav>
        </div>

        {/* Desktop Logout Button */}
        <button
          onClick={logout}
          className="hidden md:block mt-8 w-full sketch-btn-secondary py-2 font-handwriting"
        >
          Log Out
        </button>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-6 md:p-8 relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-bold font-handwriting">
              Classroom Whiteboard
            </h2>
            <p className="font-casual text-gray-500 mt-1">
              Check announcements, launch RAG sessions, or enroll in new subjects.
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="sketch-btn-secondary px-4 py-2 font-handwriting flex items-center gap-2"
          >
            {theme === "light" ? "Blackboard Mode" : "Whiteboard Mode"}
          </button>
        </header>

        {/* Dash Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column (Left/Center) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ruled Paper Announcement Board */}
            <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)]">
              <h3 className="text-xl font-bold font-handwriting mb-4 border-b-2 border-dashed border-black dark:border-zinc-700 pb-2">
                Class Announcements
              </h3>
              <div className="ruled-bg font-casual text-lg text-zinc-700 dark:text-zinc-300">
                <p>Welcome to N.O.V.A! Your AI assistant is grounded in real slides.</p>
                <p>New lecture materials for CS101 have been indexed into Pinecone.</p>
                <p>Earn the 'RAG Pioneer' badge by asking 5 course-related queries!</p>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div>
              <h3 className="text-2xl font-bold font-handwriting mb-4">
                My Active Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="sketch-card p-5 bg-white dark:bg-[var(--canvas-card)] flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-casual font-bold text-xs px-2.5 py-1 rounded border border-blue-400">
                          {course.code}
                        </span>
                        <span className="text-xs font-casual text-gray-500">
                          {course.credits} Credits
                        </span>
                      </div>
                      <h4 className="text-lg font-bold font-handwriting mb-3 mt-1 leading-tight">
                        {course.title}
                      </h4>
                      <p className="text-sm font-casual text-gray-600 dark:text-zinc-400">
                        Instructor: {course.lecturer?.first_name || "Lec"} {course.lecturer?.last_name || "Name"}
                      </p>
                    </div>

                    <button 
                      onClick={() => alert(`Launching chat assistant for ${course.title}...`)}
                      className="sketch-btn-primary w-full py-2 mt-5 font-handwriting text-sm"
                    >
                      Ask AI Assistant
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Available to Enroll */}
            <div>
              <h3 className="text-2xl font-bold font-handwriting mb-4">
                Enroll in Other Courses
              </h3>
              {enrollMsg && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded font-casual">
                  {enrollMsg}
                </div>
              )}
              <div className="space-y-4">
                {availableCourses.map((course) => (
                  <div key={course.id} className="sketch-card p-4 bg-white dark:bg-[var(--canvas-card)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="font-casual bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs mr-2 font-bold">
                        {course.code}
                      </span>
                      <span className="font-bold font-handwriting text-lg">{course.title}</span>
                      <p className="text-sm font-casual text-gray-500 mt-1">
                        Lecturer: {course.lecturer?.first_name} {course.lecturer?.last_name} | Semester {course.semester}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="sketch-btn-secondary py-1.5 px-4 font-handwriting text-xs whitespace-nowrap"
                    >
                      Enroll
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Widgets Column (Right) */}
          <div className="space-y-8">
            {/* Spiral bound Notepad with Flip page Animation */}
            {showStickyNote ? (
              <div className="notebook-container w-full">
                <div className="spiral-notepad p-6 min-h-[300px] flex flex-col justify-between pt-8 relative overflow-visible">
                  
                  {/* Spiral Rings */}
                  <div className="absolute top-0 left-0 right-0 -translate-y-2 flex justify-between px-6 pointer-events-none z-30">
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="w-3 h-7 bg-zinc-800 dark:bg-zinc-300 rounded-full border border-black dark:border-white shadow-sm"
                      />
                    ))}
                  </div>

                  {/* Header Options */}
                  <div className="flex justify-between items-center mb-3 border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 pb-1 z-10">
                    <span className="font-handwriting text-sm font-bold flex items-center gap-1.5">
                      Course Journal
                    </span>
                    <button 
                      onClick={() => setShowStickyNote(false)}
                      className="text-xs bg-zinc-200 dark:bg-zinc-700 border-0 hover:text-red-500 rounded px-1 font-bold"
                    >
                      [x]
                    </button>
                  </div>

                  {/* Pages Stack with 3D Flip Transitions */}
                  <div className="relative flex-1 min-h-[160px] overflow-hidden">
                    {pages.map((pageText, idx) => {
                      let pageClass = "notebook-page absolute inset-0 w-full h-full bg-transparent flex flex-col";
                      if (idx === activePage) {
                        pageClass += " active";
                      } else if (idx < activePage) {
                        pageClass += " flip-up";
                      } else {
                        pageClass += " flip-down";
                      }

                      return (
                        <div key={idx} className={pageClass}>
                          <textarea
                            value={pageText}
                            onChange={(e) => handlePageTextChange(e.target.value)}
                            disabled={idx !== activePage}
                            className="w-full flex-1 bg-transparent border-0 outline-none resize-none font-casual text-base leading-7 ruled-bg"
                            placeholder={`Write notes on page ${idx + 1}...`}
                            rows={5}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer & Turning Controls */}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-700 z-10 font-casual text-sm">
                    <button
                      onClick={prevPage}
                      disabled={activePage === 0}
                      className={`px-2 py-0.5 border border-black dark:border-white rounded transition-all ${
                        activePage === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      Flip Back
                    </button>
                    
                    <span className="font-handwriting font-bold">
                      Page {activePage + 1} / {pages.length}
                    </span>
                    
                    <button
                      onClick={nextPage}
                      disabled={activePage === pages.length - 1}
                      className={`px-2 py-0.5 border border-black dark:border-white rounded transition-all ${
                        activePage === pages.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      Flip Page
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowStickyNote(true)}
                className="w-full sketch-btn-secondary py-2 font-handwriting text-sm"
              >
                Show Note Journal
              </button>
            )}

            {/* Socials & Media Board */}
            <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)] relative overflow-hidden">
              <div className="absolute -top-4 -right-4 opacity-10">
                <svg width="60" height="60" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10,60 C20,40 50,40 60,60 C70,40 90,50 90,70 L10,70 Z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold font-handwriting mb-4">
                Channels & Socials
              </h3>
              
              <p className="font-casual text-sm text-gray-600 dark:text-zinc-400 mb-4">
                Watch drawing tutorials, check syllabus webinars, and connect with other creators:
              </p>

              <div className="space-y-3 font-casual">
                <a
                  href="https://youtube.com/@youthlabs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded border border-black dark:border-white hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
                >
                  <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded">YT</span>
                  <div>
                    <span className="font-bold underline group-hover:text-red-500">YouTube Channel</span>
                    <div className="text-xs text-gray-400">Online Drawing & Tech Masterclass</div>
                  </div>
                </a>

                <a
                  href="https://x.com/youthlabs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded border border-black dark:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
                >
                  <span className="text-xs font-bold px-2 py-1 bg-zinc-100 text-zinc-800 rounded">X</span>
                  <div>
                    <span className="font-bold underline group-hover:text-sky-500">X / Twitter</span>
                    <div className="text-xs text-gray-400">@youthlabs_studio</div>
                  </div>
                </a>

                <a
                  href="https://discord.gg/youthlabs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded border border-black dark:border-white hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-600 rounded">DC</span>
                  <div>
                    <span className="font-bold underline group-hover:text-indigo-500">Discord Community</span>
                    <div className="text-xs text-gray-400">Interact with engineering peers</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
