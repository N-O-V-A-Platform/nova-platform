"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function GoogleAuthButton() {
  const { googleLogin } = useAuth();
  const [showChooser, setShowChooser] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Name/Role for new users
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your Google Email address.");
      return;
    }
    setError("");
    
    // Guess first and last name from email if possible to save typing
    const namePart = email.split("@")[0];
    const parts = namePart.split(/[._-]/);
    if (parts.length >= 2) {
      setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      setLastName(parts[1].charAt(0).toUpperCase() + parts[1].slice(1));
    } else if (parts.length === 1) {
      setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      setLastName("");
    }

    setStep(2);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Send mock Google OAuth payload to backend.
      // Backend automatically registers/logs in the user.
      const credential = `mock_google_${email}:${firstName}:${lastName}:${role}`;
      await googleLogin(credential);
    } catch (err: any) {
      setError(err.message || "Google Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const resetModal = () => {
    setShowChooser(false);
    setStep(1);
    setEmail("");
    setFirstName("");
    setLastName("");
    setError("");
    setLoading(false);
  };

  return (
    <>
      {/* Main Google Login Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowChooser(true);
        }}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border-2 border-black dark:border-white rounded-md py-2.5 px-4 font-handwriting hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
      >
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Google Login Pop-up Modal */}
      {showChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] border-3 border-black dark:border-white p-6 rounded-lg shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#fff] flex flex-col my-8">
            
            {/* Google Logo / Brand */}
            <div className="flex flex-col items-center mb-6 text-center">
              <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <h3 className="text-xl font-bold font-handwriting text-black dark:text-white">Sign in with Google</h3>
              <p className="text-sm font-casual text-gray-500">to continue to N.O.V.A.</p>
            </div>

            {error && (
              <div className="mb-4 p-2.5 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded font-casual text-center">
                {error}
              </div>
            )}

            {/* Step 1: Input Google Email */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold mb-1 font-casual text-black dark:text-white">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="sketch-input"
                    placeholder="your.email@gmail.com"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="w-1/2 sketch-btn-secondary py-2 font-handwriting text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 sketch-btn-primary py-2 font-handwriting text-sm"
                  >
                    Next
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Confirm Name & Role */}
            {step === 2 && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-casual text-gray-600 dark:text-zinc-300 text-center">
                  Signing in as <span className="font-bold text-[#E75A3D]">{email}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold mb-0.5 font-casual text-black dark:text-white">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="sketch-input text-sm py-1.5 px-3"
                      placeholder="First Name"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold mb-0.5 font-casual text-black dark:text-white">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="sketch-input text-sm py-1.5 px-3"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-0.5 font-casual text-black dark:text-white">Select Your Platform Role</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setRole("Student")}
                      className={`py-1.5 border-2 font-handwriting text-sm rounded-md transition-all ${
                        role === "Student"
                          ? "bg-[#E75A3D] text-white border-black"
                          : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("Lecturer")}
                      className={`py-1.5 border-2 font-handwriting text-sm rounded-md transition-all ${
                        role === "Lecturer"
                          ? "bg-[#E75A3D] text-white border-black"
                          : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
                      }`}
                    >
                      Lecturer
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/2 sketch-btn-secondary py-2 font-handwriting text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 sketch-btn-primary py-2 font-handwriting text-sm"
                  >
                    {loading ? "Connecting..." : "Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
