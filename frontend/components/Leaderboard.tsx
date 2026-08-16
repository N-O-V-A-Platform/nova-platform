"use client";

import React, { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  xp: number;
  badges_count: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await authService.getLeaderboard();
      setEntries(data);
    } catch (err: any) {
      console.error("Failed to load leaderboard:", err);
      setError(err.message || "Failed to load class rankings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const fullName = `${entry.first_name} ${entry.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || entry.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  };

  return (
    <div className="sketch-card p-8 bg-white dark:bg-[var(--canvas-card)] border-2 border-black dark:border-zinc-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8 border-b-2 border-dashed border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h3 className="text-3xl font-bold font-handwriting text-zinc-900 dark:text-zinc-100">
            Class Leaderboard
          </h3>
          <p className="text-sm font-casual text-zinc-500 dark:text-zinc-400 mt-2">
            Top performers ranked by total verification XP and completed badges.
          </p>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search classmate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sketch-input py-2 px-4 text-sm w-full sm:w-56 font-casual"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#E75A3D] border-t-transparent rounded-full mb-4"></div>
          <p className="font-handwriting text-xl text-zinc-500">Grading achievements...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-base font-casual text-red-650 mb-4">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="sketch-btn-secondary px-6 py-2 text-sm font-handwriting"
          >
            Try Again
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 font-casual text-zinc-400 text-base">
          No students found matching "{searchQuery}".
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black dark:border-zinc-700 font-handwriting text-left text-lg text-zinc-700 dark:text-zinc-300">
                <th className="py-3 px-4 w-24 text-center">Rank</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center">Badges</th>
                <th className="py-3 px-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="font-casual text-base divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredEntries.map((entry) => {
                const isCurrentUser = user && user.id === entry.user_id;
                return (
                  <tr
                    key={entry.user_id}
                    className={`transition-colors ${
                      isCurrentUser
                        ? "bg-yellow-50 dark:bg-yellow-950/20 font-semibold"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/10"
                    }`}
                  >
                    <td className="py-4 px-4 text-center font-bold font-handwriting text-xl text-[#E75A3D]">
                      {getRankSuffix(entry.rank)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                          {entry.first_name} {entry.last_name}
                        </span>
                        {isCurrentUser && (
                          <span className="bg-[#E75A3D] text-white text-[10px] font-bold px-2 py-0.5 rounded border border-black uppercase font-handwriting tracking-wide">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 block sm:inline sm:ml-3">
                        {entry.email}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-400 text-sm px-3 py-1 rounded-full font-bold">
                        {entry.badges_count} Badges
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-handwriting text-xl font-bold text-zinc-700 dark:text-zinc-200">
                      {entry.xp} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
