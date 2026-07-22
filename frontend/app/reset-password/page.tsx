"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove("dark");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset token is missing. Please check your verification email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(token, password);
      setMessage(response.message || "Your password has been reset successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg">
      <h2 className="text-xl font-bold font-handwriting mb-4 text-center">
        Reset Your Password
      </h2>

      {error && (
        <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-md text-xs font-casual">
          {message}
          <p className="mt-1 text-[10px] text-zinc-500">Redirecting you to the login screen...</p>
        </div>
      )}

      {!message ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 font-casual">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D] placeholder-zinc-400 font-casual"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 font-casual">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D] placeholder-zinc-400 font-casual"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-orange-600 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            {loading ? "Updating password..." : "Confirm Password Reset"}
          </button>
        </form>
      ) : (
        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs text-[#E75A3D] hover:underline font-casual"
          >
            Click here if you are not automatically redirected
          </Link>
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
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={
          <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg text-center font-handwriting text-xl">
            Loading reset screen...
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
