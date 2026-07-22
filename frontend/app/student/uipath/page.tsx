"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";

const INTEREST_OPTIONS = [
  { id: "excel", label: "Excel & Data" },
  { id: "ui", label: "UI & Browser Automation" },
  { id: "email", label: "Email Workflows" },
  { id: "pdf", label: "PDF Extraction" },
  { id: "advanced", label: "Advanced Architecture" }
];

export default function UiPathJourneyPage() {
  const { user, loading, theme, toggleTheme } = useAuth();
  const router = useRouter();

  // UiPath Data States
  const [uipathCourses, setUipathCourses] = useState<any[]>([]);
  const [uipathJourney, setUipathJourney] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCertCourse, setSelectedCertCourse] = useState<any>(null);
  const [certCompletionDate, setCertCompletionDate] = useState("");
  const [certVerificationUrl, setCertVerificationUrl] = useState("");
  const [certVerificationId, setCertVerificationId] = useState("");
  const [certMsg, setCertMsg] = useState("");
  const [certError, setCertError] = useState("");

  // Earned Badge Popup State
  const [earnedBadgePopup, setEarnedBadgePopup] = useState<any>(null);

  // Load state and fetch data
  const fetchUiPathData = async () => {
    try {
      const coursesData = await authService.getUiPathCourses();
      setUipathCourses(coursesData);
      
      const journeyData = await authService.getUiPathJourney();
      setUipathJourney(journeyData);
    } catch (err) {
      console.error("Failed to load UiPath data:", err);
    }
  };

  const fetchRecommendations = async (interestsStr: string) => {
    try {
      const recs = await authService.getUiPathRecommendations(interestsStr);
      setAiRecommendations(recs);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchUiPathData();
    }
  }, [user, loading]);

  // Handle interest selection updates
  useEffect(() => {
    if (user) {
      const interestsStr = selectedInterests.join(",");
      fetchRecommendations(interestsStr);
    }
  }, [selectedInterests, user]);

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-handwriting text-2xl bg-[#FAF6EE] text-[#1E1E1E]">
        Opening Syllabus Path...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-zinc-950 text-black dark:text-white p-6 md:p-12">
      {/* Back to Dashboard and Theme Toggle */}
      <header className="flex justify-between items-center mb-8 border-b-2 border-black dark:border-zinc-800 pb-4">
        <button
          onClick={() => router.push("/student/dashboard")}
          className="sketch-btn-secondary py-2 px-5 font-handwriting text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center gap-4">
          <div className="sketch-card py-1.5 px-4 bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-500 rounded text-sm font-casual font-bold">
            XP: {uipathJourney ? uipathJourney.completed_count * 200 : 0}
          </div>
          <button
            onClick={toggleTheme}
            className="sketch-btn-secondary px-4 py-2 font-handwriting text-sm"
          >
            {theme === "light" ? "💡 Dark Board" : "☀️ Light Board"}
          </button>
        </div>
      </header>

      {/* Main syllabus page container */}
      <main className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-handwriting text-[#E75A3D]">
            UiPath Academy Study Path
          </h1>
          <p className="font-casual text-base text-gray-500 mt-2">
            Customize your interests to get simulated AI recommended courses, complete academy tracks, and earn custom badges.
          </p>
        </div>

        {/* Journey Progress Card */}
        {uipathJourney && (
          <div className="sketch-card p-6 bg-zinc-50 dark:bg-zinc-900 border-2 border-black dark:border-zinc-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="font-handwriting font-bold text-2xl text-yellow-600 dark:text-yellow-400">
                  Study Journey Completion
                </h3>
                <p className="text-sm font-casual text-gray-500 dark:text-zinc-400 mt-1">
                  You have completed {uipathJourney.completed_count} out of {uipathJourney.total_count} courses.
                </p>
              </div>
              <span className="font-casual text-base bg-yellow-100 dark:bg-yellow-950/80 px-3.5 py-1 border border-yellow-500 rounded font-bold">
                {uipathJourney.journey_percentage}% Journey Complete
              </span>
            </div>

            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-5 rounded-full overflow-hidden border-2 border-black dark:border-white">
              <div 
                className="bg-yellow-500 h-full transition-all duration-500" 
                style={{ width: `${uipathJourney.journey_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Interests Selection Panel */}
        <section className="sketch-card p-6 bg-white dark:bg-zinc-900/40">
          <h3 className="text-2xl font-bold font-handwriting mb-3 text-orange-600 dark:text-orange-400">
            Select Your Learning Interests
          </h3>
          <p className="text-base font-casual text-gray-500 mb-4">
            Toggle topics to tailor the AI recommendations list to your career goals:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {INTEREST_OPTIONS.map((opt) => {
              const isSelected = selectedInterests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleInterest(opt.id)}
                  className={`py-2 px-5 rounded-full border-2 font-casual text-xs md:text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                      : "bg-transparent border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white"
                  }`}
                >
                  {opt.label} {isSelected ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </section>

        {/* AI Recommendations Panel */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-2xl font-bold font-handwriting">
              AI Personalized Recommendations
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiRecommendations.length > 0 ? (
              aiRecommendations.map((course) => (
                <div 
                  key={course.id} 
                  className="sketch-card p-5 bg-[#FFFDF9] dark:bg-zinc-900 border-2 border-orange-400 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-casual font-bold text-xs px-2 py-0.5 rounded border border-orange-400">
                        {course.difficulty}
                      </span>
                      <span className="text-xs font-casual text-gray-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{course.duration}</span>
                      </span>
                    </div>

                    <h4 className="font-bold font-handwriting text-xl leading-tight mt-1">
                      {course.title}
                    </h4>

                    {/* AI Reasoning Text Box */}
                    <div className="bg-yellow-50/50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-300 dark:border-yellow-700/60 text-xs md:text-sm font-casual text-gray-600 dark:text-zinc-400 mt-3 leading-relaxed">
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">AI Reason: </span>
                      {course.ai_reason || "Suggested next foundational RPA course to learn."}
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-yellow-600 dark:text-yellow-400 font-casual font-bold text-sm">
                      +{course.xp} XP
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={course.enroll_url}
                        target="_blank"
                        rel="noreferrer"
                        className="sketch-btn-secondary py-1.5 px-3 font-handwriting text-xs"
                      >
                        Enroll
                      </a>
                      <button
                        onClick={() => {
                          setSelectedCertCourse(course);
                          setCertCompletionDate(new Date().toISOString().split("T")[0]);
                          setShowCertModal(true);
                        }}
                        className="sketch-btn-primary py-1.5 px-3 font-handwriting text-xs"
                      >
                        Verify Cert
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center text-gray-500 font-casual py-6 text-sm bg-zinc-50/40 dark:bg-zinc-800/10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                Select some interests above to customize your AI recommendations!
              </p>
            )}
          </div>
        </section>

        {/* Complete Study Path Timeline */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold font-handwriting">
            Complete Study Path Timeline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uipathCourses.map((course, idx) => {
              const isCompleted = course.completed;
              const isRecommended = uipathJourney?.recommended_course?.id === course.id;

              const diffColor = 
                course.difficulty === "Beginner" 
                  ? "border-green-400 bg-green-50/10 text-green-600 dark:text-green-400" 
                  : course.difficulty === "Intermediate"
                  ? "border-orange-400 bg-orange-50/10 text-orange-600 dark:text-orange-400"
                  : "border-red-400 bg-red-50/10 text-red-600 dark:text-red-400";

              return (
                <div 
                  key={course.id} 
                  className={`sketch-card p-5 bg-white dark:bg-zinc-900 border-2 transition-all flex flex-col justify-between ${
                    isCompleted ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" : "border-zinc-300 dark:border-zinc-700"
                  } ${isRecommended ? "border-yellow-500 shadow-md ring-2 ring-yellow-400/20 animate-pulse" : ""}`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="font-casual bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        Step {idx + 1}
                      </span>
                      <span className={`font-casual px-1.5 py-0.5 rounded text-[10px] border font-bold ${diffColor}`}>
                        {course.difficulty}
                      </span>
                      <span className="font-casual text-[10px] text-gray-500 ml-auto flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{course.duration}</span>
                      </span>
                    </div>

                    <h4 className="font-bold font-handwriting text-lg leading-tight mt-1">
                      {course.title}
                    </h4>
                    <p className="text-xs md:text-sm font-casual text-gray-500 mt-2 leading-relaxed">
                      {course.description}
                    </p>
                    
                    {isCompleted && (
                      <div className="mt-3 text-xs md:text-sm font-casual text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>Badge: {course.badge_name} (+{course.xp} XP)</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-2">
                    <div>
                      {isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-casual font-bold text-xs">
                          ✓ Completed
                        </span>
                      ) : isRecommended ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-casual font-bold text-xs animate-pulse">
                          ★ Recommended
                        </span>
                      ) : (
                        <span className="text-gray-400 font-casual text-xs">
                          Locked
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <a
                        href={course.enroll_url}
                        target="_blank"
                        rel="noreferrer"
                        className="sketch-btn-secondary py-1 px-2.5 font-handwriting text-xs text-center"
                      >
                        {isCompleted ? "Review" : "Academy Link"}
                      </a>
                      
                      {!isCompleted && (
                        <button
                          onClick={() => {
                            setSelectedCertCourse(course);
                            setCertCompletionDate(new Date().toISOString().split("T")[0]);
                            setShowCertModal(true);
                          }}
                          className="sketch-btn-primary py-1 px-2.5 font-handwriting text-xs"
                        >
                          Verify Cert
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

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
            
            <div className="space-y-4 font-casual text-sm md:text-base">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                To prevent fake submissions, please enter your official <b>UiPath Academy Certificate Verification URL</b>.
              </p>

              <div>
                <span className="font-bold block mb-1">Course Title</span>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded border border-zinc-200 dark:border-zinc-700 font-semibold">
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
                    
                    // Trigger award popup!
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

      {/* Earned Badge Congratulations Popup with Animation */}
      {earnedBadgePopup && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <style>{`
            @keyframes scaleIn {
              0% { transform: scale(0.3); opacity: 0; }
              70% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes spinSlow {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .animate-scale-in {
              animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .animate-spin-slow {
              animation: spinSlow 8s linear infinite;
            }
          `}</style>
          <div className="sketch-card w-full max-w-sm bg-yellow-50 dark:bg-zinc-900 border-4 border-yellow-500 p-6 text-center animate-scale-in relative shadow-2xl border-black rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/10 to-transparent pointer-events-none" />
            
            {/* Spinning background rays */}
            <div className="w-32 h-32 mx-auto mb-4 relative flex items-center justify-center">
              <div className="absolute w-full h-full border-4 border-dashed border-yellow-400 dark:border-yellow-600 rounded-full animate-spin-slow" />
              <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>

            <h3 className="text-3xl font-bold font-handwriting text-yellow-600 dark:text-yellow-400 mb-2">
              Badge Earned!
            </h3>
            
            <p className="font-casual font-bold text-lg text-black dark:text-white leading-tight mb-2">
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
