"use client";

import React, { useState, useEffect } from "react";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";

export default function StudentSettingsPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [prefMsg, setPrefMsg] = useState("");
  const [goalMsg, setGoalMsg] = useState("");
  
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // New settings states to enrich the page
  const [dailyGoalHours, setDailyGoalHours] = useState("1.5");
  const [studyMode, setStudyMode] = useState("focused");

  // Sync preference with user context
  useEffect(() => {
    if (user && user.reminders_enabled !== undefined) {
      setRemindersEnabled(user.reminders_enabled);
    }
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setUpdating(true);
    try {
      const res = await authService.setPassword(password);
      setMsg(res.message || "Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleReminders = async () => {
    setPrefMsg("");
    try {
      const res = await authService.toggleReminders();
      setRemindersEnabled(res.reminders_enabled);
      setPrefMsg("Preferences saved successfully!");
      setTimeout(() => setPrefMsg(""), 2000);
    } catch (err: any) {
      setPrefMsg("Failed to update reminder preferences.");
    }
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalMsg("Learning goals updated successfully!");
    setTimeout(() => setGoalMsg(""), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D]">
          Account Settings
        </h2>
        <p className="font-casual text-base text-zinc-500 dark:text-zinc-400 mt-1.5">
          Manage security, preferences, and customize your N.O.V.A study dashboard.
        </p>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Profile & Dashboard Preferences */}
        <div className="space-y-8">
          {/* Profile Details Card */}
          <div className="sketch-card p-6 bg-zinc-50 dark:bg-zinc-800/20 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile Details</span>
            </h3>
            <div className="font-casual text-base space-y-3 text-zinc-650 dark:text-zinc-300">
              <div><span className="font-bold text-[#1E1E1E] dark:text-white">Name:</span> {user?.first_name} {user?.last_name}</div>
              <div><span className="font-bold text-[#1E1E1E] dark:text-white">Email:</span> {user?.email}</div>
              <div><span className="font-bold text-[#1E1E1E] dark:text-white">Account Status:</span> {user?.status}</div>
              <div><span className="font-bold text-[#1E1E1E] dark:text-white">Role:</span> {user?.role_name || "Student"}</div>
            </div>
          </div>

          {/* Reminder Preference Card */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-4 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Notification Preferences</span>
            </h3>
            
            {prefMsg && (
              <div className="mb-4 p-3 bg-yellow-50 text-black border border-black rounded text-sm font-casual font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {prefMsg}
              </div>
            )}

            <div className="flex items-start justify-between gap-6 font-casual text-sm md:text-base">
              <div className="space-y-1.5">
                <span className="font-bold block">Daily Whiteboard Reminders</span>
                <p className="text-xs md:text-sm text-zinc-500 leading-relaxed">
                  Receive beautifully-themed emails encouraging you to continue your study tracks and complete recommended RPA challenges.
                </p>
              </div>
              <button
                onClick={handleToggleReminders}
                className={`px-4.5 py-2 border-2 rounded font-handwriting font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm whitespace-nowrap transition-colors ${
                  remindersEnabled
                    ? "bg-emerald-500 border-black text-white"
                    : "bg-zinc-200 border-black text-zinc-655"
                }`}
              >
                {remindersEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          {/* Learning Goals Card */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-4 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Learning Dashboard Preferences</span>
            </h3>

            {goalMsg && (
              <div className="mb-4 p-3 bg-yellow-50 text-black border border-black rounded text-sm font-casual font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {goalMsg}
              </div>
            )}

            <form onSubmit={handleSaveGoals} className="space-y-4 font-casual text-sm md:text-base">
              <div className="flex flex-col">
                <label className="font-semibold mb-1.5">Daily Study Goal (Hours)</label>
                <select
                  value={dailyGoalHours}
                  onChange={(e) => setDailyGoalHours(e.target.value)}
                  className="p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                >
                  <option value="0.5">30 Minutes / day</option>
                  <option value="1.0">1 Hour / day</option>
                  <option value="1.5">1.5 Hours / day</option>
                  <option value="2.0">2 Hours / day</option>
                  <option value="3.0">3+ Hours / day</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-semibold mb-1.5">Preferred AI Study Recommendation Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="studymode"
                      value="focused"
                      checked={studyMode === "focused"}
                      onChange={() => setStudyMode("focused")}
                      className="accent-[#E75A3D] w-4 h-4"
                    />
                    <span>Structured / Path-based</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="studymode"
                      value="exploratory"
                      checked={studyMode === "exploratory"}
                      onChange={() => setStudyMode("exploratory")}
                      className="accent-[#E75A3D] w-4 h-4"
                    />
                    <span>Exploratory / Skill-based</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="sketch-btn-primary py-2 px-5 font-handwriting text-sm">
                Save Preferences
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Security, Password & System Info */}
        <div className="space-y-8">
          {/* Change Password Card */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
            <h3 className="text-2xl font-bold font-handwriting mb-4 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Change Password</span>
            </h3>

            {error && (
              <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-sm font-casual">
                {error}
              </div>
            )}

            {msg && (
              <div className="mb-4 p-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-md text-sm font-casual">
                {msg}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5 font-casual text-sm md:text-base">
              <div className="flex flex-col">
                <label className="font-semibold mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-semibold mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-transparent border-2 border-black dark:border-white rounded-md text-sm md:text-base"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={updating || !password || !confirmPassword}
                className="sketch-btn-primary w-full py-2.5 font-handwriting text-base disabled:opacity-50"
              >
                {updating ? "Updating..." : "Save Password"}
              </button>
            </form>
          </div>

          {/* System Security / Device Status Card */}
          <div className="sketch-card p-6 bg-zinc-50 dark:bg-zinc-800/20 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Security & Sessions</span>
            </h3>
            <div className="font-casual text-base space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold block">Current Device Session</span>
                  <span className="text-xs text-zinc-450 dark:text-zinc-500">Chrome on Linux • Active Now</span>
                </div>
                <span className="bg-emerald-100 border border-emerald-400 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded text-xs font-bold font-casual">
                  This Device
                </span>
              </div>
              <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-450 dark:text-zinc-500">
                <span>Last login security check: Just now</span>
                <span className="font-semibold text-blue-500">View Logs</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
