"use client";

import React, { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import Link from "next/link";

interface CourseItem {
  id: string;
  title: string;
  code: string;
  description: string;
  badge_name: string;
  difficulty: string;
  duration: string;
  xp: number;
}

interface CertItem {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  verification_url?: string;
  badge_name?: string;
}

interface BadgeItem {
  id: string;
  badge_name: string;
  awarded_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function SkillPassportPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [certificates, setCertificates] = useState<CertItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certUrl, setCertUrl] = useState("");

  const fetchData = async () => {
    try {
      const token = authService.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch available skill courses
      const cRes = await fetch(`${API_BASE}/uipath/courses`, { headers });
      if (cRes.ok) {
        const cData = await cRes.json();
        setCourses(cData || []);
      }

      // 2. Fetch my certificates & badges
      const myRes = await fetch(`${API_BASE}/uipath/my-certificates`, { headers });
      if (myRes.ok) {
        const myData = await myRes.json();
        setCertificates(myData.certificates || []);
        setBadges(myData.badges || []);
      }
    } catch (err) {
      console.error("Failed to load skill passport data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle || !certIssuer || !certDate) return;

    setSubmitting(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE}/uipath/certificates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: certTitle,
          issuer: certIssuer,
          issue_date: certDate,
          verification_url: certUrl || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setCertTitle("");
        setCertIssuer("");
        setCertDate("");
        setCertUrl("");
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to record certificate.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate XP & Tier
  const totalXp = badges.length * 150 + certificates.length * 300;
  let level = "Novice";
  let nextLevelXp = 500;
  let levelColor = "bg-zinc-200 text-zinc-700";

  if (totalXp >= 6000) {
    level = "Grandmaster";
    nextLevelXp = 10000;
    levelColor = "bg-[#FEF08A] text-yellow-900 border-yellow-500";
  } else if (totalXp >= 3000) {
    level = "Expert";
    nextLevelXp = 6000;
    levelColor = "bg-purple-100 text-purple-800 border-purple-400";
  } else if (totalXp >= 1500) {
    level = "Practitioner";
    nextLevelXp = 3000;
    levelColor = "bg-blue-100 text-blue-800 border-blue-400";
  } else if (totalXp >= 500) {
    level = "Explorer";
    nextLevelXp = 1500;
    levelColor = "bg-emerald-100 text-emerald-800 border-emerald-400";
  }

  const progressPercent = Math.min(100, Math.round((totalXp / nextLevelXp) * 100));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="sketch-card p-6 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-zinc-900 dark:to-zinc-800/30 border-2 border-black dark:border-zinc-800 rounded-2xl relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D]">
                Skill Passport & XP Ledger
              </h1>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border-2 border-black ${levelColor}`}>
                {level}
              </span>
            </div>
            <p className="text-sm font-casual text-zinc-650 dark:text-zinc-400 mt-1 max-w-xl">
              Verifiable academic record, UiPath certifications, and automated skill competency badges powered by N.O.V.A.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#E75A3D] text-white font-bold font-handwriting rounded-xl border-2 border-black hover:bg-[#d44e33] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition shrink-0"
          >
            + Add Certificate
          </button>
        </div>

        {/* XP Level Bar */}
        <div className="mt-6 pt-4 border-t-2 border-black/10 dark:border-zinc-800">
          <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5">
            <span className="text-[#E75A3D]">{totalXp} Total XP</span>
            <span className="text-zinc-500">Next Tier Goal: {nextLevelXp} XP ({progressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full border-2 border-black overflow-hidden p-0.5">
            <div
              className="h-full bg-[#E75A3D] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-xs text-zinc-500 font-mono">Total Verified XP</span>
          <div className="text-2xl font-bold font-handwriting text-[#E75A3D] mt-1">{totalXp}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-xs text-zinc-500 font-mono">Badges Awarded</span>
          <div className="text-2xl font-bold font-handwriting text-black dark:text-white mt-1">{badges.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-xs text-zinc-500 font-mono">Certificates Verified</span>
          <div className="text-2xl font-bold font-handwriting text-black dark:text-white mt-1">{certificates.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-xs text-zinc-500 font-mono">Specialized Tracks</span>
          <div className="text-2xl font-bold font-handwriting text-[#E75A3D] mt-1">{courses.length}</div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-bold font-handwriting text-black dark:text-white mb-4 flex items-center gap-2">
          <span>🏆</span> Earned Achievement Badges
        </h2>
        {badges.length === 0 ? (
          <p className="text-sm font-casual text-zinc-500 italic">No badges earned yet. Complete quizzes or verify credentials to unlock badges!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-10 h-10 rounded-full bg-[#FEF08A] border-2 border-black flex items-center justify-center text-lg shrink-0">
                  🎖️
                </div>
                <div>
                  <h4 className="font-bold font-handwriting text-sm text-black dark:text-white">{b.badge_name}</h4>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Awarded: {new Date(b.awarded_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Certificates Section */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-bold font-handwriting text-black dark:text-white mb-4 flex items-center gap-2">
          <span>📜</span> Verified Credentials & Diplomas
        </h2>
        {certificates.length === 0 ? (
          <p className="text-sm font-casual text-zinc-500 italic">No verified certificates submitted yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((c) => (
              <div key={c.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold font-handwriting text-base text-black dark:text-white">{c.title}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded font-bold font-mono">
                      ✓ VERIFIED
                    </span>
                  </div>
                  <p className="text-xs font-casual text-zinc-600 dark:text-zinc-400 mt-1">
                    Issued by: <strong className="text-black dark:text-zinc-200">{c.issuer}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    Date: {c.issue_date}
                  </p>
                </div>
                {c.verification_url && (
                  <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <a
                      href={c.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#E75A3D] font-bold hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      View External Verification ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available UiPath & RPA Curriculum Tracks */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-bold font-handwriting text-black dark:text-white mb-2 flex items-center gap-2">
          <span>🤖</span> Official UiPath & RPA Certification Curriculum Tracks
        </h2>
        <p className="text-xs font-casual text-zinc-500 mb-4">Complete these official automation tracks (Studio, Selectors, REFramework, Orchestrator) to earn verified passport badges, verify diplomas, and mint XP credentials.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#E75A3D]">{course.code}</span>
                  <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded border border-black">
                    {course.difficulty} • {course.duration}
                  </span>
                </div>
                <h3 className="font-bold font-handwriting text-base text-black dark:text-white mt-1">{course.title}</h3>
                <p className="text-xs font-casual text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{course.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">+{course.xp} XP</span>
                <Link
                  href="/student/courses"
                  className="px-3 py-1.5 bg-black text-white text-xs font-bold font-handwriting rounded-lg hover:bg-zinc-800 transition"
                >
                  Enroll Now ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for adding certificate */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h3 className="font-bold text-lg font-handwriting text-black dark:text-white">
              Add Verified Credential
            </h3>
            <form onSubmit={handleSubmitCertificate} className="space-y-3 font-casual text-sm">
              <div>
                <label className="block font-bold mb-1">Certificate Title</label>
                <input
                  type="text"
                  placeholder="e.g. UiPath Automation Developer Associate"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Issuer</label>
                <input
                  type="text"
                  placeholder="e.g. UiPath Academy, AWS, Coursera"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Issue Date</label>
                <input
                  type="date"
                  value={certDate}
                  onChange={(e) => setCertDate(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Verification URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://academy.uipath.com/..."
                  value={certUrl}
                  onChange={(e) => setCertUrl(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-black rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#E75A3D] text-white border-2 border-black rounded-lg text-xs font-bold font-handwriting shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {submitting ? "Saving..." : "Verify & Mint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
