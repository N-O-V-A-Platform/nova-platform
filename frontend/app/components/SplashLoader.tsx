"use client";

import React, { useState, useEffect } from "react";
import Mascot from "./Mascot";

export default function SplashLoader() {
  const [loaderWidth, setLoaderWidth] = useState("0%");

  useEffect(() => {
    const timer = setTimeout(() => setLoaderWidth("100%"), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF6EE] text-[#1E1E1E] transition-colors duration-200">
      <div className="text-center space-y-6 flex flex-col items-center">
        {/* Custom Animated Mascot */}
        <Mascot className="w-36 h-36 md:w-44 md:h-44 animate-mascot-fly" />
        
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold font-handwriting tracking-wide">
            N.O.V.A.
          </h1>
          <p className="text-sm font-casual tracking-widest text-zinc-500 uppercase">
            Loading your blackboard...
          </p>
        </div>

        <div className="w-48 h-4 border-2 border-black rounded-md bg-white p-0.5 shadow-[2.5px_2.5px_0px_#000]">
          <div 
            className="h-full bg-[#E75A3D] rounded-sm transition-all duration-[1500ms] ease-out"
            style={{ width: loaderWidth }}
          />
        </div>
      </div>
    </div>
  );
}
