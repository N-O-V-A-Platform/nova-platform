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
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // Public pages are always in light mode (Whiteboard theme)
    document.documentElement.classList.remove("dark");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role_name: roleName,
        institution_code: institutionCode.trim() || null
      });
      setSuccessMsg("Welcome to N.O.V.A.! A verification email has been sent to your inbox. Please check your email and click the verification link to activate your account.");
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
            Register Account
          </h2>

          {error && (
            <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-600 rounded-md text-xs font-casual">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-md text-xs font-casual">
              {successMsg}
            </div>
          )}

          {!successMsg ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-0.5 font-casual">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="sketch-input py-1.5 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
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
                    className="sketch-input py-1.5 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
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
                  className="sketch-input py-1.5 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
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
                  className="sketch-input py-1.5 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold mb-1 font-casual">Register As</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleName("Student")}
                    className={`py-2 border-2 font-handwriting text-sm rounded-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
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
                    className={`py-2 border-2 font-handwriting text-sm rounded-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      roleName === "Lecturer"
                        ? "bg-[#E75A3D] text-white border-black"
                        : "bg-white text-gray-700 border-black hover:bg-zinc-50"
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
                  className="sketch-input py-1.5 px-3 text-sm border-2 border-black rounded-md outline-none focus:ring-2 focus:ring-[#E75A3D]"
                  placeholder="e.g. AJIET"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center pt-2">
              <p className="text-xs font-casual text-zinc-500">
                Please verify your email address to activate your account.
              </p>
              <Link
                href="/login"
                className="inline-block py-2 px-6 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-sm rounded-md hover:bg-orange-600 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                Return to Sign In
              </Link>
            </div>
          )}

          {!successMsg && (
            <>
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
                <span>Already registered? </span>
                <Link href="/login" className="underline font-bold hover:text-[#E75A3D] text-black">
                  Sign in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer credits */}
      <div className="text-xs text-zinc-400 font-casual mt-8">
        &copy; {new Date().getFullYear()} N.O.V.A Platform. All rights reserved.
      </div>
    </div>
  );
}
