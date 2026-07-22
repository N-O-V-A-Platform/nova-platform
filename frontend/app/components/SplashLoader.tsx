"use client";

import React, { useState, useEffect } from "react";
import Mascot from "./Mascot";

export default function SplashLoader() {
  const [loaderWidth, setLoaderWidth] = useState("0%");
  const [animationClass, setAnimationClass] = useState("animate-mascot-fly");
  const [funnyMessage, setFunnyMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoaderWidth("100%"), 80);

    // Track refreshes, choose mascot animation, and trigger funny dialogs
    if (typeof window !== "undefined") {
      try {
        const storedCount = localStorage.getItem("nova_refresh_count");
        const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
        const newCount = currentCount + 1;
        localStorage.setItem("nova_refresh_count", newCount.toString());

        // Different animation on every single refresh, cycling through all 7
        const animations = [
          "animate-mascot-fly",
          "animate-mascot-orbit",
          "animate-mascot-dash",
          "animate-mascot-wiggle",
          "animate-mascot-spiral",
          "animate-mascot-bounce",
          "animate-mascot-zoom"
        ];
        const animationIndex = newCount % animations.length;
        setAnimationClass(animations[animationIndex]);

        // Trigger funny speech bubble message every 5th refresh
        if (newCount % 5 === 0) {
          const jokes = [
            "Refreshing again? Slow internet connection?",
            "Maybe you should borrow your friend's hotspot?",
            `This is refresh number ${newCount}... is your router taking a nap?`,
            "Clicking reload won't make my code compile faster!",
            "Hang in there, N.O.V.A. is working overtime!",
            "Are we having connection issues, or are you just testing my animations?"
          ];
          const jokeIndex = Math.floor((newCount / 5) - 1) % jokes.length;
          setFunnyMessage(jokes[jokeIndex]);
        }
      } catch (e) {
        console.warn("Failed to access localStorage for refresh counter:", e);
      }
    }

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF6EE] text-[#1E1E1E] transition-colors duration-200">
      <div className="text-center space-y-6 flex flex-col items-center max-w-sm px-4">
        
        {/* Funny Speech Bubble */}
        {funnyMessage && (
          <div className="relative mb-2 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-950 border-2 border-black dark:border-zinc-700 rounded-lg shadow-[3px_3px_0px_#000] text-sm font-handwriting text-center animate-bounce text-[#1E1E1E] dark:text-yellow-100 z-10">
            <p className="leading-tight">{funnyMessage}</p>
            {/* Speech bubble pointer */}
            <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3.5 h-3.5 bg-yellow-50 dark:bg-yellow-950 border-r-2 border-b-2 border-black dark:border-zinc-700 rotate-45" />
          </div>
        )}

        {/* Custom Animated Mascot */}
        <Mascot className={`w-36 h-36 md:w-44 md:h-44 ${animationClass}`} />
        
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
