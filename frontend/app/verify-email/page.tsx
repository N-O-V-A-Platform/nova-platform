"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [statusState, setStatusState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    // Force light theme
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!token) {
      setStatusState("error");
      setMessage("No verification token was provided. Please check your verification link.");
      return;
    }

    const verify = async () => {
      try {
        const response = await authService.verifyEmail(token);
        setStatusState("success");
        setMessage(response.message || "Your email has been verified successfully!");
      } catch (err: any) {
        setStatusState("error");
        setMessage(err.message || "Email verification failed. The token may be invalid or expired.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg text-center">
      {statusState === "loading" && (
        <div className="space-y-4">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#E75A3D] border-t-transparent rounded-full"></div>
          <h2 className="text-xl font-bold font-handwriting">Verifying...</h2>
          <p className="text-sm font-casual text-zinc-600">{message}</p>
        </div>
      )}

      {statusState === "success" && (
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-black bg-emerald-100 text-emerald-700 font-bold text-2xl">
            ✓
          </div>
          <h2 className="text-xl font-bold font-handwriting text-emerald-700">Verification Complete!</h2>
          <p className="text-sm font-casual text-zinc-700">{message}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block py-2 px-6 bg-[#E75A3D] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-orange-600 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              Go to Login
            </Link>
          </div>
        </div>
      )}

      {statusState === "error" && (
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-black bg-red-100 text-red-700 font-bold text-2xl">
            ✗
          </div>
          <h2 className="text-xl font-bold font-handwriting text-red-700">Verification Failed</h2>
          <p className="text-sm font-casual text-red-600">{message}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block py-2 px-6 bg-[#1E1E1E] text-white border-2 border-black font-handwriting text-lg rounded-md hover:bg-zinc-800 transition-all shadow-[3px_3px_0px_0px_rgba(231,90,61,1)]"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-[#FAF6EE] text-[#1E1E1E]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold font-handwriting tracking-wide text-[#E75A3D]">
            N.O.V.A.
          </h1>
          <p className="text-sm font-casual mt-1 text-zinc-600">
            Account Activation
          </p>
        </div>

        <Suspense fallback={
          <div className="sketch-card p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black rounded-lg text-center font-handwriting text-xl">
            Loading activation screen...
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
