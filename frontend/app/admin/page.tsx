"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminOverview, authService, PendingLecturer } from "@/services/auth";

type AdminTab =
  | "overview"
  | "announcements"
  | "security"
  | "users"
  | "maintenance"
  | "submissions"
  | "approvals"
  | "operations"
  | "integrations";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "announcements", label: "Public Announcements" },
  { id: "security", label: "Security & Forgery Alerts" },
  { id: "users", label: "User Management" },
  { id: "maintenance", label: "Maintenance Mode" },
  { id: "submissions", label: "Student Excel Reports" },
  { id: "approvals", label: "Lecturer Approvals" },
  { id: "operations", label: "Operations" },
  { id: "integrations", label: "Integrations" },
];

interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface ManagedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not run yet";
}

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [lecturers, setLecturers] = useState<PendingLecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");

  // Announcements state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementRole, setAnnouncementRole] = useState("All");
  const [announcementLink, setAnnouncementLink] = useState("");

  // Security alerts state
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // User management state
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role_name !== "Admin")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const loadSecurityAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const token = authService.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/security-alerts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setSecurityAlerts(data);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const loadUsersManagement = useCallback(async (role?: string) => {
    setUsersLoading(true);
    try {
      const token = authService.getToken();
      const filter = role && role !== "All" ? `?role_filter=${encodeURIComponent(role)}` : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/users-management${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOverview, nextLecturers, maintRes] = await Promise.all([
        authService.getAdminOverview(),
        authService.getPendingLecturers(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/maintenance-status`),
      ]);
      setOverview(nextOverview);
      setLecturers(nextLecturers);
      if (maintRes.ok) {
        const mData = await maintRes.json();
        setMaintenanceEnabled(Boolean(mData.maintenance_mode));
        setMaintenanceMsg(mData.message || "");
      }
      void loadSecurityAlerts();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadSecurityAlerts]);

  useEffect(() => {
    if (user?.role_name === "Admin") {
      void loadDashboard();
    }
  }, [user, loadDashboard]);

  useEffect(() => {
    if (activeTab === "security") {
      void loadSecurityAlerts();
    } else if (activeTab === "users") {
      void loadUsersManagement(userRoleFilter);
    }
  }, [activeTab, loadSecurityAlerts, loadUsersManagement, userRoleFilter]);

  const handleToggleMaintenance = async (enable: boolean) => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const token = authService.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/maintenance-mode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: enable,
            message:
              maintenanceMsg ||
              "N.O.V.A. is currently under scheduled maintenance. Please check back shortly.",
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setMaintenanceEnabled(enable);
        setMessage(json.message);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to toggle maintenance mode.");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMsg.trim()) return;
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const token = authService.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/broadcast-announcement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: announcementTitle,
            message: announcementMsg,
            target_role: announcementRole,
            link: announcementLink.trim() || null,
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setMessage(`Success: ${json.message}`);
        setAnnouncementTitle("");
        setAnnouncementMsg("");
        setAnnouncementLink("");
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to broadcast announcement.");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUserStatus = async (
    userId: string,
    newStatus: "Active" | "Suspended" | "Inactive"
  ) => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const token = authService.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/users/${userId}/status?new_status=${newStatus}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const json = await res.json();
        setMessage(json.message);
        void loadUsersManagement(userRoleFilter);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to update user status.");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const result =
        action === "approve"
          ? await authService.approveLecturer(id)
          : await authService.rejectLecturer(id);
      setMessage(result.message);
      await loadDashboard();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const triggerScrape = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const result = await authService.triggerScrape();
      setMessage(result.message || "Knowledge-base refresh started.");
      await loadDashboard();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user || user.role_name !== "Admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF6EE] font-handwriting text-2xl text-[#1E1E1E]">
        Opening the administrator control center...
      </main>
    );
  }

  const configuredIntegrations =
    overview?.integrations.filter((item) => item.configured).length ?? 0;

  const filteredUsers = usersList.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    return fullName.includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <main className="min-h-screen bg-[#FAF6EE] text-[#1E1E1E]">
      <header className="border-b-2 border-black bg-white px-4 py-4 shadow-[0_3px_0_0_rgba(0,0,0,1)] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="font-handwriting text-4xl font-bold text-[#E75A3D]">
              N.O.V.A.
            </Link>
            <p className="font-casual text-xs uppercase tracking-[0.16em] text-zinc-500">
              Administrator Master Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-handwriting text-lg font-bold">
                {user.first_name} {user.last_name}
              </p>
              <p className="font-casual text-xs text-zinc-500">Platform administrator</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md border-2 border-black bg-white px-3 py-2 font-casual text-xs font-bold hover:bg-zinc-100 transition shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-x-0.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 lg:grid-cols-[250px_1fr] lg:px-8">
        {/* Navigation Sidebar */}
        <aside className="rounded-xl border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] lg:h-fit">
          <p className="px-3 pb-2 pt-1 font-casual text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Control Center
          </p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between whitespace-nowrap rounded-md border-2 px-3 py-2 text-left font-handwriting text-lg transition-colors ${
                  activeTab === tab.id
                    ? "border-black bg-[#E75A3D] text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                    : "border-transparent hover:border-black hover:bg-[#FAF6EE]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "approvals" && lecturers.length > 0 && (
                  <span className="ml-2 rounded-full bg-[#FEF08A] px-2 py-0.5 font-casual text-[10px] font-bold text-black border border-black">
                    {lecturers.length}
                  </span>
                )}
                {tab.id === "security" && securityAlerts.length > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 font-casual text-[10px] font-bold text-white">
                    {securityAlerts.length}
                  </span>
                )}
                {tab.id === "maintenance" && maintenanceEnabled && (
                  <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 font-casual text-[10px] font-bold text-black">
                    ON
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-4 rounded-lg border-2 border-dashed border-zinc-300 bg-[#FEF08A]/50 p-3 font-casual text-xs leading-relaxed text-zinc-700">
            🔒 Administrative Master Session Active. Security monitoring & anti-forgery guards active.
          </div>
        </aside>

        {/* Content Section */}
        <section className="min-w-0">
          {(message || error) && (
            <div
              className={`mb-5 rounded-lg border-2 p-3 font-casual text-sm ${
                error
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-emerald-500 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          {loading || !overview ? (
            <div className="rounded-xl border-2 border-black bg-white p-10 text-center font-handwriting text-xl shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
              Loading live platform data...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <p className="font-casual text-sm text-zinc-500">Platform pulse</p>
                    <h1 className="font-handwriting text-4xl font-bold">Good to see you, {user.first_name}.</h1>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Total learners", overview.users.students, "Student accounts"],
                      ["Active lecturers", overview.users.lecturers - overview.users.pending_lecturers, "Approved teaching staff"],
                      ["Approval queue", overview.users.pending_lecturers, "Needs your review"],
                      ["Knowledge chunks", overview.scraper.indexed_chunks, "Available to the AI"],
                    ].map(([label, value, hint]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      >
                        <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                        <p className="my-1 font-handwriting text-4xl font-bold text-[#E75A3D]">{value}</p>
                        <p className="font-casual text-xs text-zinc-600">{hint}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick Admin Actions Row */}
                  <div className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Quick Operations</p>
                    <h2 className="font-handwriting text-2xl font-bold mt-1">Admin Command Shortcuts</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <button
                        onClick={() => setActiveTab("announcements")}
                        className="p-3 text-left border-2 border-black rounded-lg bg-orange-50 hover:bg-orange-100 transition shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        <span className="text-xl">📢</span>
                        <h4 className="font-handwriting text-lg font-bold mt-1">Broadcast Notice</h4>
                        <p className="font-casual text-xs text-zinc-600">Send realtime notification to all students</p>
                      </button>
                      <button
                        onClick={() => setActiveTab("submissions")}
                        className="p-3 text-left border-2 border-black rounded-lg bg-emerald-50 hover:bg-emerald-100 transition shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        <span className="text-xl">📊</span>
                        <h4 className="font-handwriting text-lg font-bold mt-1">Download Ledger</h4>
                        <p className="font-casual text-xs text-zinc-600">Export student certificates to Excel (.xlsx)</p>
                      </button>
                      <button
                        onClick={() => setActiveTab("maintenance")}
                        className="p-3 text-left border-2 border-black rounded-lg bg-yellow-50 hover:bg-yellow-100 transition shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        <span className="text-xl">🛠️</span>
                        <h4 className="font-handwriting text-lg font-bold mt-1">Maintenance Lock</h4>
                        <p className="font-casual text-xs text-zinc-600">Instant toggle for public-facing site</p>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <section className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Knowledge base</p>
                          <h2 className="font-handwriting text-2xl font-bold">Scraper status</h2>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 font-casual text-xs font-bold ${
                            overview.scraper.is_running ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {overview.scraper.is_running ? "Running" : "Ready"}
                        </span>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 gap-4 font-casual text-sm">
                        <div>
                          <dt className="text-zinc-500">Sources</dt>
                          <dd className="font-bold">{overview.scraper.sources}</dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Last refresh</dt>
                          <dd className="font-bold">{formatDate(overview.scraper.last_run)}</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => setActiveTab("operations")}
                        className="mt-5 font-casual text-sm font-bold underline hover:text-[#E75A3D]"
                      >
                        Manage knowledge operations →
                      </button>
                    </section>
                    <section className="rounded-xl border-2 border-black bg-[#1E1E1E] p-5 text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <p className="font-casual text-xs uppercase tracking-wide text-zinc-400">Integration health</p>
                      <h2 className="font-handwriting text-2xl font-bold">
                        {configuredIntegrations}/{overview.integrations.length} services configured
                      </h2>
                      <p className="mt-3 font-casual text-sm text-zinc-300">
                        Review which providers are available without exposing any secret value.
                      </p>
                      <button
                        onClick={() => setActiveTab("integrations")}
                        className="mt-5 rounded-md border-2 border-white px-3 py-2 font-casual text-xs font-bold hover:bg-white hover:text-black"
                      >
                        View integration health
                      </button>
                    </section>
                  </div>
                </div>
              )}

              {/* TAB 2: PUBLIC ANNOUNCEMENTS */}
              {activeTab === "announcements" && (
                <section className="space-y-6">
                  <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <div className="border-b-2 border-black pb-4">
                      <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Communication Center</p>
                      <h1 className="font-handwriting text-3xl font-bold">Broadcast Public Announcement</h1>
                      <p className="mt-1 font-casual text-xs text-zinc-600 max-w-xl">
                        Send instant push notifications and WebSocket broadcasts directly to students and faculty.
                        Use this to announce monthly winners, tournament updates, or new UiPath tracks.
                      </p>
                    </div>

                    <form onSubmit={handleBroadcastAnnouncement} className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold font-mono uppercase text-zinc-600 mb-1">
                            Announcement Headline / Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={announcementTitle}
                            onChange={(e) => setAnnouncementTitle(e.target.value)}
                            placeholder="e.g. 🎉 Monthly UiPath Championship Winners Announced!"
                            className="w-full rounded-lg border-2 border-black p-3 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold font-mono uppercase text-zinc-600 mb-1">
                            Audience Target
                          </label>
                          <select
                            value={announcementRole}
                            onChange={(e) => setAnnouncementRole(e.target.value)}
                            className="w-full rounded-lg border-2 border-black p-3 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D] bg-white"
                          >
                            <option value="All">All Registered Users (Students & Faculty)</option>
                            <option value="Student">Students Only</option>
                            <option value="Lecturer">Lecturers & Faculty Only</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold font-mono uppercase text-zinc-600 mb-1">
                          Detailed Announcement Message *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={announcementMsg}
                          onChange={(e) => setAnnouncementMsg(e.target.value)}
                          placeholder="e.g. Heartiest congratulations to our top 3 RPA achievers for this month! Prizes and special badges have been credited to your skill passports. The new Advanced Automation Developer curriculum is now live."
                          className="w-full rounded-lg border-2 border-black p-3 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold font-mono uppercase text-zinc-600 mb-1">
                          Optional Action Link (Opens when user clicks notification)
                        </label>
                        <input
                          type="text"
                          value={announcementLink}
                          onChange={(e) => setAnnouncementLink(e.target.value)}
                          placeholder="e.g. /student/uipath or /student/analytics"
                          className="w-full rounded-lg border-2 border-black p-3 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                        />
                      </div>

                      {/* Quick Templates */}
                      <div className="pt-2">
                        <p className="text-xs font-mono font-bold text-zinc-500 uppercase mb-2">Quick Message Templates:</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementTitle("🏆 Monthly RPA Tournament Prizes Awarded!");
                              setAnnouncementMsg("The monthly leaderboard has been finalized. Cash prizes and vouchers have been distributed to the top 3 learners. Keep submitting your UiPath certificates to qualify for next month!");
                              setAnnouncementLink("/student/uipath");
                            }}
                            className="text-xs font-casual bg-zinc-100 hover:bg-zinc-200 border border-black rounded px-2.5 py-1"
                          >
                            🏆 Monthly Prizes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementTitle("🚀 New UiPath Automation Track Available!");
                              setAnnouncementMsg("We just unlocked the UiPath Specialized AI Associate track. Complete it today to earn +150 platform points and a gold mastery badge!");
                              setAnnouncementLink("/student/uipath");
                            }}
                            className="text-xs font-casual bg-zinc-100 hover:bg-zinc-200 border border-black rounded px-2.5 py-1"
                          >
                            🚀 New Track Release
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementTitle("⚠️ Scheduled Maintenance Notice");
                              setAnnouncementMsg("N.O.V.A. will undergo a 15-minute system update tonight at 23:00 IST. Please save your work beforehand.");
                              setAnnouncementLink("");
                            }}
                            className="text-xs font-casual bg-zinc-100 hover:bg-zinc-200 border border-black rounded px-2.5 py-1"
                          >
                            ⚠️ Maintenance Alert
                          </button>
                        </div>
                      </div>

                      {/* Preview card */}
                      {announcementTitle && (
                        <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50">
                          <p className="text-[11px] font-mono uppercase text-[#E75A3D] font-bold">Student In-App Preview</p>
                          <h4 className="font-handwriting text-lg font-bold mt-1 text-zinc-900">📢 {announcementTitle}</h4>
                          <p className="font-casual text-xs text-zinc-700 mt-1 whitespace-pre-wrap">{announcementMsg || "Your announcement message will appear here."}</p>
                          {announcementLink && (
                            <p className="text-[11px] font-mono text-[#E75A3D] mt-2 underline">Action target: {announcementLink}</p>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t-2 border-zinc-200 flex justify-end">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="rounded-lg border-2 border-black bg-[#E75A3D] px-6 py-2.5 font-handwriting text-lg font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-[#d4482c] transition disabled:opacity-50"
                        >
                          {actionLoading ? "Dispatching..." : "🚀 Broadcast to All Users"}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {/* TAB 3: SECURITY & FORGERY ALERTS */}
              {activeTab === "security" && (
                <section className="space-y-6">
                  <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                      <div>
                        <p className="font-casual text-xs uppercase tracking-wide text-red-600 font-bold">
                          Autonomous Integrity Guardian
                        </p>
                        <h1 className="font-handwriting text-3xl font-bold">Certificate Anti-Forgery Alerts</h1>
                        <p className="mt-1 font-casual text-xs text-zinc-600 max-w-xl">
                          Every submitted certificate URL is inspected against authentic issuers (UiPath Academy, Credly, Accredible) with entropy validation and SSL checks. Spoofed or fake submissions are intercepted automatically.
                        </p>
                      </div>
                      <button
                        onClick={() => void loadSecurityAlerts()}
                        disabled={alertsLoading}
                        className="rounded-md border-2 border-black px-3 py-2 font-casual text-xs font-bold hover:bg-[#FAF6EE] transition shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        {alertsLoading ? "Scanning..." : "🔄 Refresh Alerts"}
                      </button>
                    </div>

                    <div className="mt-6">
                      {securityAlerts.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 p-8 text-center font-casual">
                          <span className="text-3xl">🛡️</span>
                          <h3 className="font-handwriting text-xl font-bold text-emerald-900 mt-2">All Clear! No Forgery Interceptions</h3>
                          <p className="text-xs text-emerald-700 mt-1">
                            The Certificate Inspector Agent is running 24/7. Any fraudulent URL attempts will immediately trigger a red flag here and issue a disciplinary warning to the offender.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {securityAlerts.map((alert) => (
                            <div
                              key={alert.id}
                              className="rounded-lg border-2 border-red-500 bg-red-50 p-4 shadow-[2px_2px_0_0_rgba(239,68,68,1)]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2">
                                  <span className="text-xl">🚨</span>
                                  <div>
                                    <h4 className="font-handwriting text-lg font-bold text-red-950">{alert.title}</h4>
                                    <p className="font-casual text-xs text-red-800 mt-1 whitespace-pre-wrap leading-relaxed">
                                      {alert.message}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                                  {new Date(alert.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-3 pt-2 border-t border-red-200 flex items-center justify-between text-[11px] font-casual text-red-900">
                                <span>Agent Status: <strong>Submission Blocked & Disciplinary Warning Delivered</strong></span>
                                <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded font-mono font-bold">Audit Logged</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 4: USER MANAGEMENT */}
              {activeTab === "users" && (
                <section className="space-y-6">
                  <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                      <div>
                        <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Platform Governance</p>
                        <h1 className="font-handwriting text-3xl font-bold">User Directory & Status Management</h1>
                        <p className="mt-1 font-casual text-xs text-zinc-600 max-w-xl">
                          Inspect all platform participants, monitor their status, and instantly suspend or restore accounts if policy violations occur.
                        </p>
                      </div>
                      <button
                        onClick={() => void loadUsersManagement(userRoleFilter)}
                        disabled={usersLoading}
                        className="rounded-md border-2 border-black px-3 py-2 font-casual text-xs font-bold hover:bg-[#FAF6EE] transition shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        {usersLoading ? "Refreshing..." : "🔄 Refresh Users"}
                      </button>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="mt-5 flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search users by name or email address..."
                          className="w-full rounded-lg border-2 border-black p-2.5 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                        />
                      </div>
                      <div className="flex gap-2">
                        {["All", "Student", "Lecturer", "Admin"].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setUserRoleFilter(r);
                              void loadUsersManagement(r);
                            }}
                            className={`rounded-lg border-2 border-black px-3 py-1.5 font-casual text-xs font-bold transition ${
                              userRoleFilter === r
                                ? "bg-black text-white"
                                : "bg-white text-black hover:bg-[#FAF6EE]"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Users Table */}
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead className="border-b-2 border-black font-handwriting text-lg bg-[#FAF6EE]">
                          <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Joined</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 font-casual text-sm">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-500">
                                No users matched your search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-zinc-50">
                                <td className="p-3 font-bold text-zinc-900">
                                  {u.first_name} {u.last_name}
                                </td>
                                <td className="p-3 font-mono text-xs text-zinc-600">{u.email}</td>
                                <td className="p-3">
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                                      u.role === "Admin"
                                        ? "bg-purple-100 text-purple-800"
                                        : u.role === "Lecturer"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {u.role}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-xs text-zinc-500">{u.created_at}</td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                      u.status === "Active"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-400"
                                        : "bg-red-100 text-red-800 border border-red-400"
                                    }`}
                                  >
                                    {u.status || "Active"}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {u.role !== "Admin" && (
                                    <div className="flex justify-end gap-1.5">
                                      {u.status === "Suspended" ? (
                                        <button
                                          disabled={actionLoading}
                                          onClick={() => handleUpdateUserStatus(u.id, "Active")}
                                          className="rounded border-2 border-black bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:bg-emerald-700 transition"
                                        >
                                          Reactivate
                                        </button>
                                      ) : (
                                        <button
                                          disabled={actionLoading}
                                          onClick={() => handleUpdateUserStatus(u.id, "Suspended")}
                                          className="rounded border-2 border-red-400 bg-red-100 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-200 transition"
                                        >
                                          Suspend
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 5: MAINTENANCE MODE */}
              {activeTab === "maintenance" && (
                <section className="space-y-6">
                  <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                      <div>
                        <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">
                          Platform Availability & Control
                        </p>
                        <h1 className="font-handwriting text-3xl font-bold">Server Maintenance Mode</h1>
                        <p className="mt-1 font-casual text-xs text-zinc-600 max-w-xl">
                          Toggle the public website into an instant maintenance lockdown. When active, students and general visitors see a friendly construction screen. <strong>You and the administrator portal remain completely unaffected.</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 font-casual text-xs font-bold ${
                            maintenanceEnabled
                              ? "bg-amber-100 text-amber-800 border border-amber-400"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-400"
                          }`}
                        >
                          {maintenanceEnabled ? "⚠️ Maintenance Active" : "✓ Platform Online"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold font-mono uppercase text-zinc-600 mb-1">
                          Custom Notice for Public Visitors
                        </label>
                        <textarea
                          rows={3}
                          value={maintenanceMsg}
                          onChange={(e) => setMaintenanceMsg(e.target.value)}
                          placeholder="e.g. N.O.V.A. is currently upgrading its autonomous reasoning models. Normal access will resume in 30 minutes."
                          className="w-full rounded-lg border-2 border-black p-3 text-sm font-casual focus:outline-none focus:ring-2 focus:ring-[#E75A3D]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-zinc-200">
                        <p className="text-xs font-casual text-zinc-500">
                          State persists across server restarts via Redis persistent store.
                        </p>
                        <div className="flex gap-2">
                          {maintenanceEnabled ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleToggleMaintenance(false)}
                              className="rounded-lg border-2 border-black bg-emerald-600 px-4 py-2 font-handwriting text-base font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-emerald-700 transition"
                            >
                              Deactivate Maintenance (Bring Website Online)
                            </button>
                          ) : (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleToggleMaintenance(true)}
                              className="rounded-lg border-2 border-black bg-amber-500 px-4 py-2 font-handwriting text-base font-bold text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-amber-600 transition"
                            >
                              Activate Maintenance Mode
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 6: STUDENT EXCEL REPORTS */}
              {activeTab === "submissions" && (
                <section className="space-y-6">
                  <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                      <div>
                        <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Student Certification Records</p>
                        <h1 className="font-handwriting text-3xl font-bold">Monthly Submissions & Excel Export</h1>
                        <p className="mt-1 font-casual text-xs text-zinc-600 max-w-xl">
                          Track which students completed and submitted which UiPath or RPA certifications on a month-by-month basis. Download formatted spreadsheet reports.
                        </p>
                      </div>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/admin/export-submissions-excel`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border-2 border-black bg-[#E75A3D] px-4 py-2.5 font-handwriting text-base font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-[#d4482c] transition shrink-0 flex items-center gap-2"
                      >
                        <span>📥</span> Download Excel Ledger (.xlsx)
                      </a>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3 font-casual">
                      <div className="rounded-lg border-2 border-black p-4 bg-emerald-50">
                        <span className="text-xs text-emerald-800 font-bold uppercase">Report Format</span>
                        <h4 className="font-handwriting text-xl font-bold text-emerald-950 mt-1">Multi-Sheet Workbook</h4>
                        <p className="text-[11px] text-emerald-700 mt-1">Includes student profiles, email, certificate name, submission timestamps, and monthly totals.</p>
                      </div>
                      <div className="rounded-lg border-2 border-black p-4 bg-orange-50">
                        <span className="text-xs text-[#E75A3D] font-bold uppercase">Automated Ledger</span>
                        <h4 className="font-handwriting text-xl font-bold text-orange-950 mt-1">Live Database Sync</h4>
                        <p className="text-[11px] text-orange-800 mt-1">Auto-updates whenever students submit certificates in the Skill Passport.</p>
                      </div>
                      <div className="rounded-lg border-2 border-black p-4 bg-blue-50">
                        <span className="text-xs text-blue-800 font-bold uppercase">Audit Verification</span>
                        <h4 className="font-handwriting text-xl font-bold text-blue-950 mt-1">Issuer Authenticity</h4>
                        <p className="text-[11px] text-blue-800 mt-1">Distinguishes UiPath Academy, Coursera, AWS, and campus certificates.</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 7: APPROVALS */}
              {activeTab === "approvals" && (
                <section className="rounded-xl border-2 border-black bg-white p-5 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="font-casual text-sm text-zinc-500">Identity & access</p>
                      <h1 className="font-handwriting text-3xl font-bold">Lecturer approval queue</h1>
                    </div>
                    <button
                      onClick={() => void loadDashboard()}
                      className="rounded-md border-2 border-black px-3 py-2 font-casual text-xs font-bold hover:bg-[#FAF6EE]"
                    >
                      Refresh
                    </button>
                  </div>
                  {lecturers.length === 0 ? (
                    <p className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center font-casual text-zinc-500">
                      Your approval queue is clear.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead className="border-b-2 border-black font-handwriting text-lg">
                          <tr>
                            <th className="p-3">Applicant</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3 text-right">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 font-casual text-sm">
                          {lecturers.map((lecturer) => (
                            <tr key={lecturer.id}>
                              <td className="p-3 font-bold">
                                {lecturer.first_name} {lecturer.last_name}
                              </td>
                              <td className="p-3 font-mono text-xs">{lecturer.email}</td>
                              <td className="p-3">
                                <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                                  Lecturer
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  disabled={actionLoading}
                                  onClick={() => void handleAction(lecturer.id, "reject")}
                                  className="mr-2 rounded border-2 border-red-300 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => void handleAction(lecturer.id, "approve")}
                                  className="rounded border-2 border-black bg-[#E75A3D] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
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
                </section>
              )}

              {/* TAB 8: OPERATIONS */}
              {activeTab === "operations" && (
                <section className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <p className="font-casual text-sm text-zinc-500">Content & AI operations</p>
                  <h1 className="font-handwriting text-3xl font-bold">Knowledge base refresh</h1>
                  <div className="mt-6 rounded-xl border-2 border-black bg-[#FAF6EE] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-handwriting text-xl font-bold">UiPath source scraper</p>
                        <p className="mt-1 max-w-xl font-casual text-sm text-zinc-600">
                          Refreshes the sources that ground study resources and AI answers. The job runs in the background and can take several minutes.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 font-casual text-xs font-bold ${
                          overview.scraper.is_running ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {overview.scraper.is_running ? "Refresh in progress" : "Ready to refresh"}
                      </span>
                    </div>
                    <dl className="mt-5 grid gap-4 sm:grid-cols-3 font-casual text-sm">
                      <div>
                        <dt className="text-zinc-500">Tracked sources</dt>
                        <dd className="font-bold">{overview.scraper.sources}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Indexed chunks</dt>
                        <dd className="font-bold">{overview.scraper.indexed_chunks}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Last run</dt>
                        <dd className="font-bold">{formatDate(overview.scraper.last_run)}</dd>
                      </div>
                    </dl>
                    <button
                      disabled={actionLoading || overview.scraper.is_running}
                      onClick={() => void triggerScrape()}
                      className="mt-6 rounded-md border-2 border-black bg-[#E75A3D] px-4 py-2 font-handwriting text-lg text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {overview.scraper.is_running ? "Refresh running" : "Refresh knowledge base"}
                    </button>
                  </div>
                </section>
              )}

              {/* TAB 9: INTEGRATIONS */}
              {activeTab === "integrations" && (
                <div className="space-y-5">
                  <section className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    <p className="font-casual text-sm text-zinc-500">Credential safety</p>
                    <h1 className="font-handwriting text-3xl font-bold">Integration health</h1>
                    <p className="mt-2 max-w-2xl font-casual text-sm leading-relaxed text-zinc-600">
                      This screen only reports whether a provider is configured. API keys are deliberately never read back or sent to the browser.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {overview.integrations.map((integration) => (
                        <div
                          key={integration.name}
                          className="flex items-center justify-between rounded-lg border-2 border-black p-4"
                        >
                          <span className="font-handwriting text-xl font-bold">{integration.name}</span>
                          <span
                            className={`rounded-full px-2 py-1 font-casual text-xs font-bold ${
                              integration.configured ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {integration.configured ? "Configured" : "Not configured"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-xl border-2 border-amber-500 bg-amber-50 p-5 font-casual text-sm leading-relaxed text-amber-950">
                    <p className="font-handwriting text-xl font-bold">How to rotate a key safely</p>
                    <p className="mt-2">
                      Update the secret in your deployment’s secret manager (or the backend environment file for local development), restart the backend, then confirm the provider state here. For production, use a managed secret store such as Doppler, 1Password Secrets Automation, AWS Secrets Manager, or HashiCorp Vault—never a plaintext field in an admin dashboard.
                    </p>
                  </section>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
