"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Public pages (landing, login, signup) are always in light mode (Whiteboard theme)
    document.documentElement.classList.remove("dark");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Doodles */}
      <div className="absolute top-12 left-12 select-none hidden md:block text-gray-400 animate-float opacity-40">
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Scribble Star */}
          <path d="M50 15 L62 38 L88 40 L68 56 L75 82 L50 68 L25 82 L32 56 L12 40 L38 38 Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute bottom-12 right-12 select-none hidden md:block text-gray-400 animate-glide opacity-40">
        <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Scribble Cloud & Sun */}
          <path d="M20 60 C25 50, 40 50, 45 60 C50 50, 70 50, 75 60 C80 60, 85 70, 75 80 L25 80 C15 75, 15 65, 20 60 Z" strokeLinecap="round" />
          <circle cx="70" cy="30" r="10" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-8 relative">
          <h1 className="text-6xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-md font-casual mt-2">
            <span className="highlight-yellow">Beyond Scores. Towards Understanding.</span>
          </p>
          {/* Handdrawn line */}
          <div className="w-32 h-2 mx-auto mt-3 relative">
            <svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0,5 Q50,0 100,5" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Login Card */}
        <div className="sketch-card p-8 bg-white dark:bg-[#1E1E1E]">
          <h2 className="text-2xl font-bold font-handwriting mb-6 text-center">
            Sign In to Class
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md text-sm font-casual">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 font-casual">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sketch-input"
                placeholder="you@school.edu"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 font-casual">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sketch-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sketch-btn-primary py-3 mt-4 text-lg font-handwriting"
            >
              {loading ? "Verifying..." : "Enter Classroom"}
            </button>
          </form>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-zinc-300 dark:border-zinc-700"></div>
            </div>
            <span className="relative bg-white dark:bg-[#1E1E1E] px-3 font-casual text-sm text-gray-500">
              or
            </span>
          </div>

          <GoogleAuthButton />

          <div className="mt-6 text-center text-sm font-casual">
            <span>First time here? </span>
            <Link href="/register" className="underline font-bold hover:text-[#E75A3D]">
              Register your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
