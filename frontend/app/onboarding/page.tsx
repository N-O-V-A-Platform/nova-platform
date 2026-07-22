"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SplashLoader from "@/app/components/SplashLoader";

export default function OnboardingPage() {
  const { user, loading, onboard, logout } = useAuth();
  const router = useRouter();

  const [roleName, setRoleName] = useState<"Student" | "Lecturer">("Student");
  const [institutionCode, setInstitutionCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.is_onboarded) {
      if (user.role_name === "Admin") {
        router.push("/admin");
      } else if (user.role_name === "Lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onboard({
        role_name: roleName,
        institution_code: institutionCode.trim() || null,
      });
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <SplashLoader />;
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-[#FAF6EE] text-[#1E1E1E]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold font-handwriting tracking-wide text-[#E75A3D]">
            Welcome to N.O.V.A.!
          </h1>
          <p className="text-sm font-casual mt-1 text-zinc-600">
            Let's finish setting up your profile.
          </p>
        </div>

        {/* Form Card */}
        <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg">
          <h2 className="text-xl font-bold font-handwriting mb-4 text-center">
            Choose Your Identity
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="text-xs font-semibold mb-2 block font-casual">
                Who are you?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRoleName("Student")}
                  className={`py-3 border-2 font-handwriting text-base rounded-md transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    roleName === "Student"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white text-gray-700 border-black hover:bg-zinc-50"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRoleName("Lecturer")}
                  className={`py-3 border-2 font-handwriting text-base rounded-md transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    roleName === "Lecturer"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white text-gray-700 border-black hover:bg-zinc-50"
                  }`}
                >
                  Lecturer
                </button>
              </div>
            </div>

            {/* Institution Code */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1 font-casual">
                Institution Code (Optional)
              </label>
              <input
                type="text"
                value={institutionCode}
                onChange={(e) => setInstitutionCode(e.target.value)}
                className="sketch-input py-2 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D] placeholder-zinc-400 font-casual"
                placeholder="e.g. MIT, STANFORD"
              />
              <p className="text-[10px] text-zinc-500 font-casual mt-1">
                Link to your university or institution workspace.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#1E1E1E] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(231,90,61,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Writing config..." : "Confirm & Enter N.O.V.A."}
            </button>
          </form>

          {/* Logout Option */}
          <div className="mt-5 text-center">
            <button
              onClick={logout}
              className="text-xs text-zinc-500 hover:text-red-500 underline font-casual"
            >
              Sign out of this account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
