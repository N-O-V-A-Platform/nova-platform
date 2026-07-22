"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authService, PendingLecturer } from "@/services/auth";
import { useRouter } from "next/navigation";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lecturers, setLecturers] = useState<PendingLecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role_name !== "Admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchPending = async () => {
    try {
      const data = await authService.getPendingLecturers();
      setLecturers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    if (user && user.role_name === "Admin") {
      let active = true;
      authService
        .getPendingLecturers()
        .then((data) => {
          if (active) {
            setLecturers(data);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(getErrorMessage(err));
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }
  }, [user]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setMessage("");
    setError("");
    try {
      const result = action === "approve"
        ? await authService.approveLecturer(id)
        : await authService.rejectLecturer(id);
      setMessage(result.message);
      fetchPending();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 relative overflow-hidden bg-[#FAF6EE] text-[#1E1E1E]">
      <div className="w-full max-w-4xl">
        
        {/* Title */}
        <div className="text-center mb-8 relative">
          <Link href="/" className="inline-block hover:scale-105 transition-transform">
            <h1 className="text-5xl font-bold font-handwriting tracking-wide">
              N.O.V.A.
            </h1>
          </Link>
          <p className="text-md font-casual mt-2">
            <span className="highlight-yellow">Admin Verification Panel</span>
          </p>
          <div className="w-32 h-2 mx-auto mt-3 relative">
            <svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0,5 Q50,0 100,5" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="mb-4 p-3 border-2 border-green-500 bg-green-50 text-green-700 rounded-md text-sm font-casual text-center">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 border-2 border-red-500 bg-red-50 text-red-700 rounded-md text-sm font-casual text-center">
            {error}
          </div>
        )}

        {/* Requests Card */}
        <div className="sketch-card p-6 bg-white">
          <h2 className="text-2xl font-bold font-handwriting mb-6">
            Lecturer Approval Queue ({lecturers.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 font-handwriting text-lg text-gray-500">
              Loading requests...
            </div>
          ) : lecturers.length === 0 ? (
            <div className="text-center py-12 font-casual text-gray-400">
              No pending lecturer approval requests in queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-black font-handwriting text-left text-lg">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Email Address</th>
                    <th className="py-2 px-3">Role Requested</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-casual text-sm divide-y divide-zinc-200">
                  {lecturers.map((lec) => (
                    <tr key={lec.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-3 font-semibold">
                        Dr. {lec.first_name} {lec.last_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">{lec.email}</td>
                      <td className="py-3 px-3">
                        <span className="bg-orange-100 border border-orange-300 text-orange-800 text-xs px-2 py-0.5 rounded">
                          {lec.role_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleAction(lec.id, "reject")}
                          className="sketch-btn-secondary py-1 px-3 text-xs bg-red-50 text-red-600 border-red-300 hover:bg-red-100"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(lec.id, "approve")}
                          className="sketch-btn-primary py-1 px-3 text-xs bg-green-50 border-green-400 hover:bg-green-100"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/login" className="font-casual text-sm underline hover:text-[#E75A3D]">
            Return to Sign In page
          </Link>
        </div>

      </div>
    </div>
  );
}
