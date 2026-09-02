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
    <div className="sketch-card p-6 bg-white dark:bg-[var(--canvas-card)] border-2 border-black dark:border-zinc-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b-2 border-dashed border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-2xl font-bold font-handwriting text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🏆 Top 5 Student Rankings</span>
          </h3>
          <p className="text-xs font-casual text-zinc-500 dark:text-zinc-400 mt-0.5">
            Top performers ranked by AI Teacher Studio XP and adaptive lesson milestones.
          </p>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search classmate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sketch-input py-1.5 px-3 text-xs w-full sm:w-48 font-casual"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin inline-block w-6 h-6 border-3 border-[#E75A3D] border-t-transparent rounded-full mb-2"></div>
          <p className="font-handwriting text-base text-zinc-500">Grading achievements...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm font-casual text-red-650 mb-3">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="sketch-btn-secondary px-4 py-1.5 text-xs font-handwriting"
          >
            Try Again
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-10 font-casual text-zinc-400 text-sm">
          No students found matching "{searchQuery}".
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black dark:border-zinc-700 font-handwriting text-left text-base text-zinc-700 dark:text-zinc-300">
                <th className="py-2 px-3 w-20 text-center">Rank</th>
                <th className="py-2 px-3">Student Name</th>
                <th className="py-2 px-3 text-center">Badges</th>
                <th className="py-2 px-3 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="font-casual text-sm divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredEntries.slice(0, 5).map((entry) => {
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
                    <td className="py-2.5 px-3 text-center font-bold font-handwriting text-lg text-[#E75A3D]">
                      {getRankSuffix(entry.rank)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                          {entry.first_name} {entry.last_name}
                        </span>
                        {isCurrentUser && (
                          <span className="bg-[#E75A3D] text-white text-[9px] font-bold px-1.5 py-0.2 rounded border border-black uppercase font-handwriting tracking-wide">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block sm:inline sm:ml-2">
                        {entry.email}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {entry.badges_count} Badges
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-handwriting text-lg font-bold text-zinc-700 dark:text-zinc-200">
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
