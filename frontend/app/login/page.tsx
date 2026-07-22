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
    // Public pages are always in light mode (Whiteboard theme)
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
    <div className="min-h-screen bg-[#FAF6EE] text-[#1E1E1E] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Centered Brand Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold font-handwriting tracking-wide text-[#E75A3D]">
          N.O.V.A.
        </h1>
        <p className="text-xs uppercase tracking-wider font-casual text-zinc-500 mt-2">
          Beyond Scores. Towards Understanding.
        </p>
      </div>

      {/* Centered Auth Card */}
      <div className="w-full max-w-md">
        <div className="sketch-card p-6 sm:p-8 bg-white border-2 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold font-handwriting mb-6 text-center">
            Sign In to N.O.V.A.
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1 font-casual">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D] font-casual"
                placeholder="you@school.edu"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold font-casual">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] text-zinc-500 hover:text-black underline font-casual"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Enter Classroom"}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-zinc-300"></div>
            </div>
            <span className="relative bg-white px-2 font-casual text-xs text-gray-500">
              or
            </span>
          </div>

          <GoogleAuthButton />

          <div className="mt-5 text-center text-xs font-casual text-zinc-600">
            <span>First time here? </span>
            <Link href="/register" className="underline font-bold hover:text-[#E75A3D] text-black">
              Register your account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer credits */}
      <div className="text-xs text-zinc-400 font-casual mt-8">
        &copy; {new Date().getFullYear()} N.O.V.A Platform. All rights reserved.
      </div>
    </div>
  );
}
