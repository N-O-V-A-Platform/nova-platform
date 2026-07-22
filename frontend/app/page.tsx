"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    // Force light mode theme
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Doodles */}
      <div className="absolute top-12 left-12 select-none hidden md:block text-[#E75A3D] animate-float opacity-40">
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Sketchy Lightbulb */}
          <path d="M50,15 C35,15 35,40 35,50 C35,60 45,65 45,75 L55,75 C55,65 65,60 65,50 C65,40 65,15 50,15 Z" />
          <line x1="45" y1="80" x2="55" y2="80" />
          <line x1="47" y1="85" x2="53" y2="85" />
          {/* rays */}
          <line x1="25" y1="30" x2="15" y2="25" />
          <line x1="75" y1="30" x2="85" y2="25" />
          <line x1="50" y1="5" x2="50" y2="0" />
        </svg>
      </div>

      <div className="absolute bottom-12 right-12 select-none hidden md:block text-gray-400 animate-glide opacity-40">
        <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Sketchy Paper Plane */}
          <path d="M10 50 L90 10 L50 90 L40 60 Z M40 60 L90 10 M40 60 L30 80 L35 60" />
        </svg>
      </div>

      <div className="w-full max-w-2xl text-center space-y-8 px-4">
        {/* Title */}
        <div className="relative">
          <h1 className="text-7xl md:text-8xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-xl md:text-2xl font-casual mt-3 max-w-lg mx-auto">
            Next-gen Optimized <span className="highlight-yellow">Virtual Assistant</span> for modern learning.
          </p>
          <div className="w-48 h-2 mx-auto mt-4 relative">
            <svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0,5 Q50,0 100,5" fill="none" stroke="currentColor" strokeWidth="3.5" />
            </svg>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4 max-w-md mx-auto">
          <Link
            href="/login"
            className="w-full sm:w-1/2 sketch-btn-primary py-3.5 px-6 text-xl font-handwriting text-center block"
          >
            Enter Classroom
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-1/2 sketch-btn-secondary py-3.5 px-6 text-xl font-handwriting text-center block"
          >
            Signup Now
          </Link>
        </div>
      </div>
    </div>
  );
}
