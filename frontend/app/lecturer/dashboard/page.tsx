"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";

export default function LecturerDashboard() {
  const { user, loading, logout, theme, toggleTheme } = useAuth();
  const router = useRouter();

  const [escalations, setEscalations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<{ [key: string]: string }>({});
  const [msg, setMsg] = useState("");

  const fetchLecturerData = async () => {
    try {
      // Fetch escalations
      const escList = await authService.getPendingEscalations();
      setEscalations(escList);

      // Fetch courses
      const allCourses = await authService.getCourses();
      setCourses(allCourses);
    } catch (err) {
      console.error("Failed to load lecturer data:", err);
      // Fallback mocks if DB is empty/returns error
      setEscalations([
        {
          id: "e1",
          question_id: "q1",
          status: "Pending",
          escalated_at: new Date().toISOString(),
          question: {
            id: "q1",
            question: "Does the midterm in CS101 cover R-Trees or only B-Trees?",
            created_at: new Date().toISOString()
          }
        }
      ]);
      setCourses([
        { id: "1", title: "Introduction to Computer Science", code: "CS101", semester: 1, credits: 4 },
        { id: "2", title: "Design & Analysis of Algorithms", code: "CS302", semester: 3, credits: 4 }
      ]);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      if (user.role_name !== "Lecturer" && user.role_name !== "Admin") {
        router.push("/student/dashboard");
      } else {
        fetchLecturerData();
      }
    }
  }, [user, loading]);

  const handleResolve = async (escalationId: string) => {
    const text = answerTexts[escalationId];
    if (!text || !text.trim()) {
      alert("Please enter an answer before publishing.");
      return;
    }

    setResolvingId(escalationId);
    setMsg("");

    try {
      await authService.resolveEscalation(escalationId, text);
      setMsg("Resolution saved & published to student!");
      
      // Update local state by removing resolved item
      setEscalations(escalations.filter(e => e.id !== escalationId));
      
      // Clear textarea
      const updatedTexts = { ...answerTexts };
      delete updatedTexts[escalationId];
      setAnswerTexts(updatedTexts);

      setTimeout(() => setMsg(""), 2000);
    } catch (err: any) {
      setMsg(`Failed to resolve: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const handleTextChange = (escalationId: string, val: string) => {
    setAnswerTexts({
      ...answerTexts,
      [escalationId]: val
    });
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
      {/* Sidebar / Topbar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-[#1E1E1E] sketch-border border-t-0 border-b-2 border-l-0 md:border-b-0 md:border-r-2 p-4 md:p-6 flex flex-col justify-between z-40">
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

            {/* Desktop Profile Card */}
            <div className="hidden md:block sketch-card p-4 mb-6 bg-zinc-50 dark:bg-zinc-800/40">
              <div className="font-handwriting text-lg leading-tight">
                Dr. {user.first_name} {user.last_name}
              </div>
              <div className="text-xs font-casual mt-1 text-gray-500 dark:text-zinc-400">
                {user.role_name}
              </div>
            </div>

            {/* Mobile Profile Card */}
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

          {/* Navigation links: scrollable horizontally on mobile, stacked vertically on desktop */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 mt-4 md:mt-0 pb-1 md:pb-0 font-handwriting">
            <button className="flex-shrink-0 px-3 py-1 bg-[#E75A3D]/10 border-2 border-[#E75A3D] rounded-md text-[#E75A3D] font-bold text-xs md:text-base md:py-2 md:w-full md:text-left">
              Classroom Desk
            </button>
            <button 
              onClick={() => alert("Upload Resource (Phase 3 Backend Link) is coming soon!")}
              className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left"
            >
              Course Materials
            </button>
            <button className="flex-shrink-0 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent hover:border-black dark:hover:border-white rounded-md transition-all text-xs md:text-base md:py-2 md:w-full md:text-left">
              Class Analytics
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
              Lecturer Whiteboard
            </h2>
            <p className="font-casual text-gray-500 mt-1">
              Publish materials, review low-confidence AI questions, and manage courses.
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="sketch-btn-secondary px-4 py-2 font-handwriting flex items-center gap-2"
          >
            {theme === "light" ? "Blackboard Mode" : "Whiteboard Mode"}
          </button>
        </header>

        {msg && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-800 rounded font-casual">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Escalations List Column (Left/Center) */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold font-handwriting mb-2">
              Pending AI Escalations
            </h3>

            {escalations.length === 0 ? (
              <div className="sketch-card p-8 text-center bg-white dark:bg-[#1E1E1E] font-casual text-lg">
                All quiet on the classroom front! The AI is resolving queries confidently.
              </div>
            ) : (
              <div className="space-y-6">
                {escalations.map((esc) => (
                  <div key={esc.id} className="sketch-card p-6 bg-white dark:bg-[#1E1E1E] relative">
                    <div className="flex justify-between items-center mb-3">
                      <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-casual text-xs px-2 py-0.5 border border-red-400 rounded">
                        Confidence Low
                      </span>
                      <span className="text-xs text-gray-400 font-casual">
                        Escalated: {new Date(esc.escalated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded mb-4">
                      <div className="text-xs font-casual uppercase text-gray-400 font-bold mb-1">
                        Student Asked:
                      </div>
                      <p className="font-handwriting text-lg italic text-zinc-800 dark:text-zinc-100">
                        "{esc.question?.question}"
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-semibold font-casual">Your Manual Correct Response:</label>
                      <textarea
                        value={answerTexts[esc.id] || ""}
                        onChange={(e) => handleTextChange(esc.id, e.target.value)}
                        placeholder="Provide the canonical answer to resolve the ticket and teach the system..."
                        className="sketch-input w-full min-h-[80px]"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => handleResolve(esc.id)}
                        disabled={resolvingId === esc.id}
                        className="sketch-btn-primary py-2 px-5 font-handwriting text-sm"
                      >
                        {resolvingId === esc.id ? "Publishing..." : "Resolve & Push"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Courses & Admin Info (Right) */}
          <div className="space-y-8">
            {/* Courses managed */}
            <div className="sketch-card p-6 bg-white dark:bg-[#1E1E1E]">
              <h3 className="text-xl font-bold font-handwriting mb-4">
                My Managed Courses
              </h3>
              <div className="space-y-3 font-casual">
                {courses.map((course) => (
                  <div key={course.id} className="p-3 border border-black dark:border-white rounded flex justify-between items-center">
                    <div>
                      <div className="font-bold">{course.title}</div>
                      <div className="text-xs text-gray-400">{course.code}</div>
                    </div>
                    <span className="text-xs font-bold bg-[#FEF08A] dark:bg-yellow-950 px-2 py-0.5 rounded border border-black dark:border-white">
                      3 Materials
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick reminders card */}
            <div className="sketch-card p-6 bg-[#FEF08A] dark:bg-yellow-950/20 text-[#1E293B] dark:text-[#E2E8F0]">
              <h3 className="text-lg font-bold font-handwriting mb-3">
                Teaching Reminders
              </h3>
              <ul className="list-disc list-inside font-casual space-y-2 text-sm">
                <li>Check your escalations list daily.</li>
                <li>Upload new PDFs to sync the RAG database.</li>
                <li>Verify students' RAG accuracy via analytics.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
