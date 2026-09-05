"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getAuthHeaders(includeContentType = false): HeadersInit {
  const token = authService.getToken();
  return {
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface Section {
  id: string;
  section_order: number;
  title: string;
  duration_mins: number;
  key_concepts?: string[];
  status: string;
}

interface LessonPlan {
  id: string;
  overview: string;
  total_sections: number;
  sections: Section[];
}

interface Misconception {
  id: string;
  topic: string;
  misconception_text: string;
  remedy_applied?: string;
  confidence: number;
  resolved: boolean;
}

interface Session {
  id: string;
  title: string;
  student_level: string;
  language: string;
  available_time_mins: number;
  learning_goal: string;
  status: string;
  current_section_index: number;
  current_step_type: string;
  lesson_plan?: LessonPlan;
  misconceptions: Misconception[];
}

interface StepData {
  session_id: string;
  section_title: string;
  section_index: number;
  total_sections: number;
  step_type: string;
  teacher_script: string;
  visual_spec?: any;
  audio_data_url?: string;
  voice_used?: string;
  avatar_config: any;
  question?: string;
}

export default function AITeacherStudio() {
  const { user } = useAuth();
  
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentStep, setCurrentStep] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Voice Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [voicePreset, setVoicePreset] = useState("dr_nova");
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showCitations, setShowCitations] = useState(false);

  // New Session Form Modal
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState("Class 10 Physics — Electricity & Ohm's Law");
  const [studentLevel, setStudentLevel] = useState("Class 10");
  const [language, setLanguage] = useState("Hinglish");
  const [timeMins, setTimeMins] = useState(20);
  const [learningGoal, setLearningGoal] = useState("Understand Ohm's Law and solve basic circuit problems");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch past sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-teacher/sessions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          loadSession(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch learning sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-teacher/sessions`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: topic,
          student_level: studentLevel,
          language: language,
          available_time_mins: Number(timeMins),
          learning_goal: learningGoal
        })
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        setActiveSession(newSession);
        setShowModal(false);
        // Automatically fetch first step
        fetchNextStep(newSession.id);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    setStepLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-teacher/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        fetchNextStep(sessionId);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setStepLoading(false);
    }
  };

  const fetchNextStep = async (sessionId: string) => {
    setStepLoading(true);
    setLastEvaluation(null);
    setStudentAnswer("");
    try {
      const res = await fetch(`${API_BASE_URL}/ai-teacher/sessions/${sessionId}/next`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const step = await res.json();
        setCurrentStep(step);
        if (!isMuted) {
          if (step.audio_data_url) {
            playAudio(step.audio_data_url, step.teacher_script);
          } else {
            speakWithBrowserTTS(step.teacher_script, activeSession?.language || "Hinglish");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch next step:", err);
    } finally {
      setStepLoading(false);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAnswer.trim() || !activeSession) return;

    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-teacher/sessions/${activeSession.id}/respond`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          response_text: studentAnswer,
          voice_preset: voicePreset,
          speech_rate: speechRate
        })
      });
      if (res.ok) {
        const evalData = await res.json();
        setLastEvaluation(evalData);
        if (!isMuted) {
          if (evalData.audio_data_url) {
            playAudio(evalData.audio_data_url, evalData.remedy_script);
          } else {
            speakWithBrowserTTS(evalData.remedy_script, activeSession.language);
          }
        }
        // Refresh session details to update misconception log
        loadSession(activeSession.id);
      }
    } catch (err) {
      console.error("Failed to evaluate answer:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const playAudio = (dataUrl: string, scriptFallback: string) => {
    if (isMuted) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(dataUrl);
    audio.playbackRate = speechRate;
    audioRef.current = audio;
    setIsPlayingAudio(true);
    audio.play().catch(() => {
      speakWithBrowserTTS(scriptFallback, activeSession?.language || "Hinglish");
    });
    audio.onended = () => setIsPlayingAudio(false);
  };

  const speakWithBrowserTTS = (text: string, lang: string) => {
    if (isMuted) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
      utterance.rate = speechRate;
      if (lang === "Hindi") utterance.lang = "hi-IN";
      else utterance.lang = "en-IN";

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMicRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = activeSession?.language === "Hindi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStudentAnswer(transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // Helper to render dynamic interactive SVG visuals
  const renderVisualCanvas = (visualSpec: any) => {
    if (!visualSpec || !visualSpec.nodes) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border-2 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-16 h-16 rounded-full bg-[#E75A3D]/10 flex items-center justify-center mb-3 border-2 border-[#E75A3D]">
            <svg className="w-8 h-8 text-[#E75A3D]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h4 className="text-black dark:text-zinc-300 font-bold font-handwriting text-lg">Dynamic Visual Canvas</h4>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1 font-casual">Interactive diagrams & analogies will be generated here by the AI Teacher.</p>
        </div>
      );
    }

    const nodes = visualSpec.nodes || [];
    const title = visualSpec.title || "Visual Concept Diagram";
    const caption = visualSpec.caption || "";
    const isAnalogy = visualSpec.type === "analogy_pipe" || visualSpec.type === "analogy";

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E75A3D] animate-ping" />
            <h4 className="font-bold text-sm font-handwriting text-black dark:text-white tracking-wide">{title}</h4>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#FEF08A] text-black font-bold border border-black font-casual">
            {isAnalogy ? "PEDAGOGICAL ANALOGY" : "DYNAMIC DIAGRAM"}
          </span>
        </div>

        {/* Interactive Nodes Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 relative">
          {nodes.map((node: any, idx: number) => (
            <div
              key={node.id || idx}
              className="bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 border-2 border-black rounded-xl p-4 transition-all duration-300 transform hover:-translate-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow border border-black"
                  style={{ backgroundColor: node.color || "#E75A3D" }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-black dark:text-white group-hover:text-[#E75A3D] transition-colors font-handwriting">
                    {node.label}
                  </h5>
                  <p className="text-xs text-zinc-500 font-mono">
                    {node.id || `node_${idx}`}
                  </p>
                </div>
              </div>
              {idx < nodes.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <svg className="w-6 h-6 text-[#E75A3D] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {caption && (
          <div className="bg-[#FEF08A]/40 dark:bg-zinc-950 border-2 border-black rounded-lg p-3 text-xs text-black dark:text-zinc-200 flex items-start gap-2 font-casual">
            <svg className="w-4 h-4 text-[#E75A3D] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{caption}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-[#121212] text-[#1E1E1E] dark:text-zinc-100 p-4 md:p-6 font-casual">
      {/* Header Banner */}
      <div className="sketch-card bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#E75A3D] text-white text-xs font-bold font-handwriting px-3 py-1 rounded-full uppercase tracking-wider shadow">
                Flagship Experience
              </span>
              <span className="bg-[#FEF08A] text-black text-xs font-mono font-bold px-2.5 py-0.5 rounded border border-black">
                ● Adaptive AI Educator Active
              </span>
            </div>
            <h1 className="text-3xl font-extrabold font-handwriting text-black dark:text-white tracking-tight">
              N.O.V.A. AI Teacher Studio
            </h1>
            <p className="text-sm font-casual text-zinc-700 dark:text-zinc-300 mt-1 max-w-2xl">
              Personalized, multilingual, and adaptive learning session grounded in course materials. Detects misconceptions and adapts strategy dynamically.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#E75A3D] hover:bg-[#d6492c] text-white font-bold font-handwriting px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Teaching Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar & Teacher Voice Player + Roadmap (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Avatar Video & Voice Controller */}
          <div className="sketch-card bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E75A3D] animate-pulse" />
                <h3 className="font-bold text-sm font-handwriting text-black dark:text-white">Dr. Nova — AI Educator</h3>
              </div>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-bold">
                {activeSession?.language || "Hinglish"}
              </span>
            </div>

            {/* Synthetic Animated Teacher Avatar */}
            <div className="relative w-full h-56 bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 rounded-xl border-2 border-black flex flex-col items-center justify-center overflow-hidden">
              {/* Dynamic Lip-Sync Pulse */}
              <div className={`relative w-28 h-28 rounded-full border-4 ${isPlayingAudio ? "border-[#E75A3D] scale-105" : "border-black"} transition-all duration-300 flex items-center justify-center shadow-2xl bg-white dark:bg-zinc-950/80`}>
                <svg className="w-16 h-16 text-[#E75A3D]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                {isPlayingAudio && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E75A3D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#E75A3D]"></span>
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-4 flex items-center gap-2 font-casual">
                <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 ${isPlayingAudio ? "bg-[#E75A3D] text-white border border-black" : "bg-[#FEF08A] text-black border border-black"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>{isPlayingAudio ? "Speaking Lesson Script..." : "READY & LISTENING"}</span>
                </span>
              </div>
            </div>

            {/* Audio Voice Control Bar & Customization */}
            <div className="mt-4 bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border-2 border-black space-y-3 font-casual">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Mute Toggle */}
                  <button
                    onClick={() => {
                      if (isPlayingAudio && audioRef.current) audioRef.current.pause();
                      setIsMuted(!isMuted);
                    }}
                    className={`p-1.5 rounded-lg border-2 border-black text-xs font-bold transition flex items-center gap-1.5 ${
                      isMuted
                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300"
                        : "bg-[#FEF08A] text-black"
                    }`}
                    title={isMuted ? "Unmute Voice" : "Mute Voice"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {isMuted ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      )}
                    </svg>
                    <span>{isMuted ? "Muted" : "Audio On"}</span>
                  </button>

                  {/* Speed Selector */}
                  <select
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                    className="bg-white dark:bg-zinc-900 border-2 border-black rounded-lg text-[11px] text-black dark:text-zinc-300 p-1 font-mono font-bold"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1.0x (Normal)</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                  </select>
                </div>

                {currentStep?.audio_data_url && !isMuted && (
                  <button
                    onClick={() => playAudio(currentStep.audio_data_url!, currentStep.teacher_script)}
                    className="p-1.5 rounded-lg bg-[#E75A3D] hover:bg-[#d6492c] text-white border-2 border-black transition shadow text-xs flex items-center gap-1 font-bold font-handwriting"
                    title="Replay Voice Script"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Replay</span>
                  </button>
                )}
              </div>

              {/* Voice Personality Dropdown */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-black text-xs">
                <span className="text-black dark:text-zinc-400 font-mono font-bold">Teacher Voice:</span>
                <select
                  value={voicePreset}
                  onChange={(e) => setVoicePreset(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border-2 border-black rounded-lg text-xs text-black dark:text-white p-1.5 focus:outline-none font-bold"
                >
                  <option value="dr_nova">Dr. Nova (Warm Female)</option>
                  <option value="prof_orion">Prof. Orion (Authoritative Male)</option>
                  <option value="aria">Aria (Enthusiastic Tutor)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lesson Plan Roadmap */}
          <div className="sketch-card bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <h3 className="font-bold text-sm font-handwriting text-black dark:text-white">Adaptive Lesson Roadmap</h3>
              <span className="text-xs text-[#E75A3D] font-mono font-bold">
                {activeSession?.lesson_plan?.total_sections || 0} Sections
              </span>
            </div>

            {activeSession?.lesson_plan?.sections ? (
              <div className="space-y-3 font-casual">
                {activeSession.lesson_plan.sections.map((sec, idx) => {
                  const isCurrent = currentStep?.section_index === idx + 1;
                  return (
                    <div
                      key={sec.id}
                      className={`p-3 rounded-xl border-2 border-black transition-all ${
                        isCurrent
                          ? "bg-[#FEF08A] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-1"
                          : "bg-zinc-50 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={isCurrent ? "text-black font-bold font-handwriting text-sm" : "text-zinc-600 dark:text-zinc-400"}>
                          {idx + 1}. {sec.title}
                        </span>
                        <span className="font-mono">{sec.duration_mins}m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic font-casual">No active session selected.</p>
            )}
          </div>
        </div>

        {/* Center & Right Column: Interactive Classroom & Misconception Engine (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Teacher Script & Canvas Card */}
          <div className="sketch-card bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
            {/* Step Banner */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="text-xs text-[#E75A3D] font-mono uppercase tracking-wider font-bold">
                  {currentStep ? `Section ${currentStep.section_index} of ${currentStep.total_sections}` : "Interactive Lesson Step"}
                </span>
                <h2 className="text-xl font-bold font-handwriting text-black dark:text-white mt-0.5">
                  {currentStep?.section_title || activeSession?.title || "Select or Start a Session"}
                </h2>
              </div>

              {activeSession && (
                <button
                  onClick={() => fetchNextStep(activeSession.id)}
                  disabled={stepLoading}
                  className="bg-black text-white hover:bg-zinc-800 font-bold font-handwriting text-xs px-4 py-2 rounded-lg border-2 border-black transition flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {stepLoading ? "Loading Next Step..." : "Advance Step ➔"}
                </button>
              )}
            </div>

            {/* Dynamic Visual Canvas */}
            {renderVisualCanvas(lastEvaluation?.visual_spec || currentStep?.visual_spec)}

            {/* Teacher Script Explanation Box */}
            <div className="bg-zinc-50 dark:bg-zinc-950/80 border-2 border-black rounded-xl p-5 text-sm text-black dark:text-zinc-200 leading-relaxed shadow-inner font-casual">
              <div className="flex items-center gap-2 mb-2 text-[#E75A3D] font-bold text-xs uppercase tracking-wider font-handwriting">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Teacher Explanation Script ({activeSession?.language || "Hinglish"})</span>
              </div>
              <p className="whitespace-pre-line text-black dark:text-zinc-300">
                {lastEvaluation?.remedy_script || currentStep?.teacher_script || "Click 'New Teaching Session' to begin your adaptive learning journey."}
              </p>
            </div>

            {/* Teacher Check Question & Adaptive Student Console */}
            {currentStep?.question && (
              <div className="bg-[#FEF08A]/30 dark:bg-zinc-950/60 border-2 border-black rounded-xl p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#E75A3D] text-white rounded-lg border-2 border-black shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#E75A3D] uppercase tracking-wide font-handwriting">
                      Teacher's Interactive Question
                    </h4>
                    <p className="text-base text-black dark:text-white font-medium font-casual mt-1">
                      {lastEvaluation?.simplified_question || currentStep.question}
                    </p>
                  </div>
                </div>

                {/* Student Answer Input Box */}
                <form onSubmit={submitAnswer} className="space-y-3 font-casual">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Type your answer or click the mic button to speak..."
                      className="w-full bg-white dark:bg-zinc-950 border-2 border-black focus:ring-2 focus:ring-[#E75A3D] rounded-xl p-3 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-inner font-casual"
                    />
                    <button
                      type="button"
                      onClick={toggleMicRecording}
                      className={`absolute right-3 bottom-3 p-2 rounded-lg border-2 border-black transition ${
                        isRecording
                          ? "bg-rose-600 text-white border-black animate-pulse"
                          : "bg-[#FEF08A] hover:bg-yellow-300 text-black"
                      }`}
                      title={isRecording ? "Listening..." : "Click to Speak"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      The AI Teacher evaluates for misconceptions in real-time.
                    </span>
                    <button
                      type="submit"
                      disabled={evaluating || !studentAnswer.trim()}
                      className="bg-[#E75A3D] hover:bg-[#d6492c] text-white font-bold font-handwriting text-sm px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                      {evaluating ? "Evaluating Answer..." : "Submit Answer ➔"}
                    </button>
                  </div>
                </form>

                {/* Adaptive Evaluation Feedback Banner */}
                {lastEvaluation && (
                  <div className={`p-4 rounded-xl border-2 border-black font-casual transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    lastEvaluation.misconception_detected
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                      : lastEvaluation.is_correct
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                      : "bg-[#FEF08A]/40 dark:bg-zinc-950/40 text-black dark:text-zinc-200"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="text-xl pt-0.5">
                        {lastEvaluation.misconception_detected ? (
                          <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : lastEvaluation.is_correct ? (
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm font-handwriting">
                            {lastEvaluation.misconception_detected
                              ? `Misconception Detected: ${lastEvaluation.misconception_title || "Conceptual Flaw"}`
                              : lastEvaluation.is_correct
                              ? "Excellent Understanding!"
                              : "Let's refine this together."}
                          </h5>
                          <span className="text-xs px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-black font-mono font-bold">
                            Conf: {(lastEvaluation.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {lastEvaluation.misconception_explanation && (
                          <p className="text-xs mt-1 text-zinc-700 dark:text-amber-300/90 font-casual">
                            {lastEvaluation.misconception_explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Session Setup Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="text-lg font-bold font-handwriting text-black dark:text-white">Configure AI Educator Session</h3>
              <button onClick={() => setShowModal(false)} className="text-black dark:text-zinc-400 hover:text-[#E75A3D] font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={createSession} className="space-y-4 text-xs font-casual">
              <div>
                <label className="block text-black dark:text-zinc-300 font-bold mb-1">Topic / Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-lg p-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-zinc-300 font-bold mb-1">Student Level</label>
                  <select
                    value={studentLevel}
                    onChange={(e) => setStudentLevel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-lg p-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  >
                    <option value="Class 10">Class 10</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Undergraduate">Undergraduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-black dark:text-zinc-300 font-bold mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-lg p-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  >
                    <option value="Hinglish">Hinglish</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-black dark:text-zinc-300 font-bold mb-1">Available Time (Mins)</label>
                <input
                  type="number"
                  value={timeMins}
                  onChange={(e) => setTimeMins(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-lg p-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  min={5}
                  max={60}
                />
              </div>

              <div>
                <label className="block text-black dark:text-zinc-300 font-bold mb-1">Learning Goal</label>
                <textarea
                  rows={2}
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-black rounded-lg p-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-black dark:text-zinc-300 font-bold border border-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#E75A3D] text-white font-bold font-handwriting border-2 border-black hover:bg-[#d6492c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
                >
                  {loading ? "Generating Plan..." : "Generate AI Lesson Plan ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
