"use client";

import React from "react";
import Leaderboard from "@/components/Leaderboard";

export default function StudentLeaderboardPage() {
  return (
    <div className="space-y-6">
      <div className="sketch-card p-6 bg-gradient-to-r from-orange-50 to-orange-100/40 dark:from-zinc-900 dark:to-zinc-800/20 border-2 border-black dark:border-zinc-800 rounded-lg relative overflow-hidden">
        <h2 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D]">
          Global Leaderboard
        </h2>
        <p className="text-sm font-casual text-zinc-650 dark:text-zinc-400 mt-1">
          Top 5 students ranked by AI Teacher Studio XP, misconception remedies, and learning milestones.
        </p>
      </div>

      <Leaderboard />
    </div>
  );
}
