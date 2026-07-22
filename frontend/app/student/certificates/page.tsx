"use client";

import React, { useEffect, useState } from "react";
import { authService } from "@/services/auth";

export default function StudentCertificatesPage() {
  const [uipathCourses, setUipathCourses] = useState<any[]>([]);
  const [uipathJourney, setUipathJourney] = useState<any>(null);
  const [selectedDifficultyTab, setSelectedDifficultyTab] = useState("All");

  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCertCourse, setSelectedCertCourse] = useState<any>(null);
  const [certCompletionDate, setCertCompletionDate] = useState("");
  const [certVerificationUrl, setCertVerificationUrl] = useState("");
  const [certVerificationId, setCertVerificationId] = useState("");
  const [certMsg, setCertMsg] = useState("");
  const [certError, setCertError] = useState("");
  const [loading, setLoading] = useState(true);

  // Congratulations Popup
  const [earnedBadgePopup, setEarnedBadgePopup] = useState<any>(null);

  const fetchUiPathData = async () => {
    try {
      const coursesData = await authService.getUiPathCourses();
      setUipathCourses(coursesData);
      const journeyData = await authService.getUiPathJourney();
      setUipathJourney(journeyData);
    } catch (err) {
      console.error("Failed to load UiPath data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUiPathData();
  }, []);

  const completedCourses = uipathCourses.filter((c) => c.completed);
  const pendingCourses = uipathCourses.filter((c) => !c.completed);

  const filteredPendingCourses = pendingCourses.filter((course) => {
    if (selectedDifficultyTab === "All") return true;
    return course.difficulty.toLowerCase() === selectedDifficultyTab.toLowerCase();
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-handwriting text-2xl">
        Verifying badge records...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D]">
          UiPath Badges & Certificates
        </h2>
        <p className="font-casual text-base text-zinc-500 dark:text-zinc-400 mt-1.5">
          Submit and manage your official UiPath Academy credentials to gain XP rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Earned Badges & Verification list */}
        <div className="lg:col-span-2 space-y-8">
          {/* Earned Badges block */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-5 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2.5">
              <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>Earned Badges ({completedCourses.length})</span>
            </h3>
            {completedCourses.length === 0 ? (
              <p className="text-sm font-casual text-zinc-400 py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                You haven't uploaded any certificates yet. Complete recommended tracks to earn badges!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 border-2 border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-lg flex gap-4 items-center"
                  >
                    <div className="text-yellow-500">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold font-handwriting text-lg leading-tight text-emerald-800 dark:text-emerald-400">
                        {course.badge_name}
                      </h4>
                      <p className="text-xs font-casual text-zinc-500 mt-1 leading-tight">
                        Course: {course.title}
                      </p>
                      <span className="text-sm font-casual font-bold text-emerald-600 dark:text-emerald-400 block mt-1.5">
                        +{course.xp} XP Claimed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending / Uncompleted courses to verify with Tab Filtering */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-4 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2.5">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5M5 19v-2a2 2 0 002-2h12a2 2 0 002 2v2m-9-2V7m-4 8h8" />
              </svg>
              <span>Submit Verification for Locked Tracks</span>
            </h3>

            {/* Tab Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["All", "Beginner", "Intermediate", "Advanced"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedDifficultyTab(tab)}
                  className={`py-1.5 px-4.5 rounded border-2 font-casual text-xs font-bold transition-all ${
                    selectedDifficultyTab === tab
                      ? "bg-[#E75A3D] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-transparent border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white text-zinc-600 dark:text-zinc-350"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredPendingCourses.length === 0 ? (
              <p className="text-sm font-casual text-zinc-400 py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                No pending courses found in this category.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredPendingCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 border-2 border-black dark:border-zinc-800 rounded-lg flex flex-col justify-between bg-zinc-50/30 dark:bg-zinc-900/30"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-casual text-[10px] font-bold px-2 py-0.5 border rounded ${
                          course.difficulty === "Beginner"
                            ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : course.difficulty === "Intermediate"
                            ? "bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                            : "bg-red-100 border-red-400 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        }`}>
                          {course.difficulty}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-casual font-semibold">
                          ⏱ {course.duration || "N/A"}
                        </span>
                      </div>
                      <h4 className="font-bold font-handwriting text-lg leading-tight mt-1 text-zinc-850 dark:text-zinc-100">
                        {course.title}
                      </h4>
                      <p className="text-xs font-casual text-zinc-450 dark:text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {course.description || "Official UiPath Academy learning path course."}
                      </p>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-yellow-600 dark:text-yellow-400 font-casual font-bold text-xs">
                        +{course.xp || 200} XP
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCertCourse(course);
                          setCertCompletionDate(new Date().toISOString().split("T")[0]);
                          setShowCertModal(true);
                        }}
                        className="sketch-btn-primary py-1 px-3 font-handwriting text-xs whitespace-nowrap shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Verify Cert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats and summary */}
        <div>
          <div className="sketch-card p-6 bg-zinc-50 dark:bg-zinc-900/40 border-2 border-black dark:border-zinc-800 rounded-lg space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
            <h4 className="font-handwriting text-xl font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2">Certification Status</h4>
            <div className="space-y-4 text-sm md:text-base font-casual text-zinc-750 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Completed tracks</span>
                <span className="font-bold">{completedCourses.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending tracks</span>
                <span className="font-bold">{pendingCourses.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Claimed XP</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">
                  {uipathJourney ? uipathJourney.completed_count * 200 : 0} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verify & Upload Certificate Modal */}
      {showCertModal && selectedCertCourse && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="sketch-card w-full max-w-md bg-white dark:bg-zinc-900 p-6 relative border-2 border-black rounded-lg">
            <button 
              onClick={() => {
                setShowCertModal(false);
                setCertMsg("");
                setCertError("");
                setCertVerificationUrl("");
                setCertVerificationId("");
              }}
              className="absolute top-4 right-4 text-sm bg-zinc-200 dark:bg-zinc-700 border-0 hover:text-red-500 rounded px-2.5 py-1 font-bold"
            >
              [x]
            </button>
            <h3 className="text-2xl font-bold font-handwriting mb-4 border-b-2 border-dashed border-black dark:border-zinc-700 pb-2 text-[#E75A3D]">
              Verify & Claim Course Badge
            </h3>
            
            <div className="space-y-5 font-casual text-sm md:text-base">
              <div>
                <span className="font-bold block mb-1">Course Title</span>
                <div className="bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded border border-zinc-200 dark:border-zinc-700 text-sm font-semibold">
                  {selectedCertCourse.title}
                </div>
              </div>

              <div>
                <span className="font-bold block mb-1.5">Date of Completion</span>
                <input
                  type="date"
                  value={certCompletionDate}
                  onChange={(e) => setCertCompletionDate(e.target.value)}
                  className="w-full p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                />
              </div>

              <div>
                <span className="font-bold block mb-1.5">Certificate Verification URL</span>
                <input
                  type="url"
                  required
                  placeholder="https://academy.uipath.com/certificates/validate/..."
                  value={certVerificationUrl}
                  onChange={(e) => setCertVerificationUrl(e.target.value)}
                  className="w-full p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                />
                <span className="text-xs text-gray-400 mt-1 block">Must start with academy.uipath.com or credentials.uipath.com</span>
              </div>

              <div>
                <span className="font-bold block mb-1.5">Certificate ID (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. UI-928374-AC"
                  value={certVerificationId}
                  onChange={(e) => setCertVerificationId(e.target.value)}
                  className="w-full p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                />
              </div>

              {certMsg && (
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">{certMsg}</p>
              )}
              {certError && (
                <p className="text-rose-600 dark:text-rose-400 text-sm font-bold">{certError}</p>
              )}

              <button
                onClick={async () => {
                  if (!certCompletionDate) {
                    setCertError("Please select a completion date.");
                    return;
                  }
                  if (!certVerificationUrl) {
                    setCertError("Please provide your official certificate verification URL.");
                    return;
                  }
                  try {
                    setCertMsg("");
                    setCertError("");
                    const res = await authService.uploadUiPathCertificate(
                      selectedCertCourse.id,
                      certCompletionDate,
                      certVerificationUrl,
                      certVerificationId
                    );
                    
                    setEarnedBadgePopup({
                      badge: res.badge_earned || selectedCertCourse.badge_name,
                      xp: res.xp_awarded || selectedCertCourse.xp
                    });

                    setShowCertModal(false);
                    setCertVerificationUrl("");
                    setCertVerificationId("");
                    fetchUiPathData();
                  } catch (err: any) {
                    setCertError(err.message);
                  }
                }}
                className="sketch-btn-primary w-full py-2.5 font-handwriting text-base"
              >
                Submit Certificate & Claim Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Congrats Popup */}
      {earnedBadgePopup && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="sketch-card w-full max-w-sm bg-yellow-50 dark:bg-zinc-900 border-4 border-yellow-500 p-6 text-center relative shadow-2xl border-black rounded-lg">
            <div className="text-yellow-500 flex justify-center mb-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold font-handwriting text-yellow-600 dark:text-yellow-400 mb-2">
              Badge Earned!
            </h3>
            <p className="font-casual font-bold text-lg leading-tight mb-2">
              {earnedBadgePopup.badge}
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-casual font-bold text-md mb-6">
              +{earnedBadgePopup.xp} XP Added to Profile
            </p>
            <button
              onClick={() => setEarnedBadgePopup(null)}
              className="sketch-btn-primary w-full py-2.5 font-handwriting text-base bg-yellow-500 hover:bg-yellow-600 border-yellow-600 text-black font-bold"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
