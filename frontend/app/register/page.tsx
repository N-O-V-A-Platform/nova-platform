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
    <div className="flex flex-col min-h-screen items-center justify-center p-3 relative overflow-hidden bg-[#FAF6EE] text-[#1E1E1E]">
      <div className="w-full max-w-md my-1">
        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-4xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-sm font-casual mt-0.5">
            Create your account to get started
          </p>
        </div>

        {/* Register Card */}
        <div className="sketch-card p-5 bg-white">
          <h2 className="text-xl font-bold font-handwriting mb-3 text-center">
            Student / Teacher Signup
          </h2>

          {error && (
            <div className="mb-3 p-2.5 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="text-xs font-semibold mb-0.5 font-casual">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="sketch-input py-1 px-2 text-sm"
                  placeholder="Arjun"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold mb-0.5 font-casual">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="sketch-input py-1 px-2 text-sm"
                  placeholder="R"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-0.5 font-casual">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sketch-input py-1 px-2 text-sm"
                placeholder="you@school.edu"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-0.5 font-casual">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sketch-input py-1 px-2 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-0.5 font-casual">Your Role</label>
              <div className="grid grid-cols-2 gap-3 mt-0.5">
                <button
                  type="button"
                  onClick={() => setRoleName("Student")}
                  className={`py-1.5 border-2 font-handwriting text-sm rounded-md transition-all ${
                    roleName === "Student"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRoleName("Lecturer")}
                  className={`py-1.5 border-2 font-handwriting text-sm rounded-md transition-all ${
                    roleName === "Lecturer"
                      ? "bg-[#E75A3D] text-white border-black"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Lecturer
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-0.5 font-casual">Institution Code (Optional)</label>
              <input
                type="text"
                value={institutionCode}
                onChange={(e) => setInstitutionCode(e.target.value)}
                className="sketch-input py-1 px-2 text-sm"
                placeholder="e.g. AJIET"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sketch-btn-primary py-2 mt-2 text-md font-handwriting"
            >
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-zinc-300"></div>
            </div>
            <span className="relative bg-white px-2 font-casual text-xs text-gray-500">
              or
            </span>
          </div>

          <GoogleAuthButton />

          <div className="mt-4 text-center text-xs font-casual">
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
