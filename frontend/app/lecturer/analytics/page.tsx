"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface DifficultTopic {
  topic: string;
  count: number;
}

interface CourseBreakdown {
  course_id: string;
  title: string;
  code: string;
  students: number;
  average_quiz_score: number | null;
  difficult_topics: DifficultTopic[];
}

interface LecturerAnalyticsData {
  courses: number;
  students: number;
  questions_asked: number;
  pending_escalations: number;
  resources: number;
  live_sessions: number;
  average_quiz_score: number | null;
  attendance_rate: number | null;
  difficult_topics: DifficultTopic[];
  course_breakdown: CourseBreakdown[];
}

export default function LecturerAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<LecturerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_BASE}/analytics/lecturer`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load lecturer analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-[#121212] text-[#1E1E1E] dark:text-zinc-100 p-4 md:p-8 font-casual">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="sketch-card bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => router.push("/lecturer/dashboard")}
                className="text-xs font-mono font-bold text-zinc-500 hover:text-black dark:hover:text-white"
              >
                ← Back to Dashboard
              </button>
              <span className="text-zinc-400">/</span>
              <span className="text-xs font-mono text-[#E75A3D] font-bold">Class Analytics</span>
            </div>
            <h1 className="text-3xl font-bold font-handwriting text-black dark:text-white">
              Institutional Teaching & Cohort Telemetry
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Real-time student comprehension metrics, cognitive bottlenecks, and RAG resolution rates.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/lecturer/materials")}
              className="px-4 py-2 border-2 border-black rounded-xl text-xs font-bold font-handwriting hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Course Materials
            </button>
            <button
              onClick={() => router.push("/lecturer/dashboard")}
              className="px-4 py-2 bg-[#E75A3D] text-white border-2 border-black rounded-xl text-xs font-bold font-handwriting hover:bg-[#d64a2f] transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Escalation Desk
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs text-zinc-500 font-mono uppercase">Enrolled Students</span>
            <div className="text-3xl font-bold font-handwriting text-[#E75A3D] mt-1">
              {loading ? "..." : data?.students ?? 0}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs text-zinc-500 font-mono uppercase">Questions Processed</span>
            <div className="text-3xl font-bold font-handwriting text-black dark:text-white mt-1">
              {loading ? "..." : data?.questions_asked ?? 0}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs text-zinc-500 font-mono uppercase">Pending Triage</span>
            <div className="text-3xl font-bold font-handwriting text-amber-600 mt-1">
              {loading ? "..." : data?.pending_escalations ?? 0}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs text-zinc-500 font-mono uppercase">Average Cohort Score</span>
            <div className="text-3xl font-bold font-handwriting text-emerald-600 mt-1">
              {loading ? "..." : data?.average_quiz_score ? `${data.average_quiz_score}%` : "N/A"}
            </div>
          </div>
        </div>

        {/* Heatmap & Difficult Topics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-bold font-handwriting text-lg text-black dark:text-white">
                Course Breakdown & Cohort Health
              </h3>
              <span className="text-xs font-mono text-[#E75A3D] font-bold">
                {data?.courses ?? 0} Courses Active
              </span>
            </div>

            {(!data?.course_breakdown || data.course_breakdown.length === 0) ? (
              <p className="text-sm text-zinc-500 italic py-6 text-center">No active course breakdown data recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.course_breakdown.map((c) => (
                  <div key={c.course_id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-black rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#E75A3D]">{c.code}</span>
                        <h4 className="font-bold text-sm text-black dark:text-white">{c.title}</h4>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono mt-1 block">
                        {c.students} Students Enrolled
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-zinc-500 block">Avg Quiz</span>
                      <span className="font-bold text-sm font-mono text-emerald-600">
                        {c.average_quiz_score ? `${c.average_quiz_score}%` : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-bold font-handwriting text-lg text-black dark:text-white">
                Cognitive Bottlenecks
              </h3>
              <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-300 font-bold">
                Misconceptions
              </span>
            </div>

            {(!data?.difficult_topics || data.difficult_topics.length === 0) ? (
              <p className="text-sm text-zinc-500 italic py-6 text-center">
                All clear! No persistent misconceptions detected by the Socratic evaluator.
              </p>
            ) : (
              <div className="space-y-2">
                {data.difficult_topics.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                    <span className="text-xs font-bold text-red-900 dark:text-red-200">{t.topic}</span>
                    <span className="text-[11px] font-mono font-bold text-red-600 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-red-300">
                      {t.count} flags
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
