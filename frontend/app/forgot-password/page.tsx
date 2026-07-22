"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { authService } from "@/services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState("");

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove("dark");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message || "A password reset link has been printed to the server terminal console.");
      if (response.token) {
        setDevToken(response.token);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-[#FAF6EE] text-[#1E1E1E]">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-sm font-casual mt-1 text-zinc-600">
            Forgot Password Recovery
          </p>
        </div>

        {/* Form Card */}
        <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg">
          <h2 className="text-xl font-bold font-handwriting mb-4 text-center">
            Recover Your Password
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-md text-xs font-casual">
              {message}
            </div>
          )}

          {!message ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold mb-1 font-casual">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D] placeholder-zinc-400 font-casual"
                  placeholder="you@school.edu"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-orange-600 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {loading ? "Requesting reset..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              {devToken && (
                <div className="p-3 border-2 border-yellow-500 bg-yellow-50 rounded-md">
                  <p className="text-[10px] uppercase font-bold text-yellow-800 font-casual mb-1">
                    Development Quick Link (Token found)
                  </p>
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="text-xs text-blue-600 hover:underline break-all font-casual"
                  >
                    Click here to reset password directly
                  </Link>
                </div>
              )}
              <p className="text-xs text-zinc-500 text-center font-casual">
                Return to the login screen after you have reset your password.
              </p>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-xs text-zinc-500 hover:text-black underline font-casual"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
