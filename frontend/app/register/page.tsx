"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("Student");
  const [institutionCode, setInstitutionCode] = useState("");
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
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role_name: roleName,
        institution_code: institutionCode || null
      });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="w-full max-w-md my-8">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-md font-casual mt-2">
            Create your account to get started
          </p>
        </div>

        {/* Register Card */}
        <div className="sketch-card p-8 bg-white dark:bg-[#1E1E1E]">
          <h2 className="text-2xl font-bold font-handwriting mb-6 text-center">
            Student / Teacher Signup
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md text-sm font-casual">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1 font-casual">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="sketch-input"
                  placeholder="Arjun"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1 font-casual">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="sketch-input"
                  placeholder="R"
                />
              </div>
            </div>

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

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 font-casual">Your Role</label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <button
                  type="button"
                  onClick={() => setRoleName("Student")}
                  className={`py-2 border-2 font-handwriting rounded-md transition-all ${roleName === "Student"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
                    }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRoleName("Lecturer")}
                  className={`py-2 border-2 font-handwriting rounded-md transition-all ${roleName === "Lecturer"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
                    }`}
                >
                  Lecturer
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 font-casual">Institution Code (Optional)</label>
              <input
                type="text"
                value={institutionCode}
                onChange={(e) => setInstitutionCode(e.target.value)}
                className="sketch-input"
                placeholder="e.g. A J Institute of Engineering and Technology"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sketch-btn-primary py-3 mt-4 text-lg font-handwriting"
            >
              {loading ? "Registering..." : "Create Account"}
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
            <span>Already registered? </span>
            <Link href="/login" className="underline font-bold hover:text-[#E75A3D]">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
