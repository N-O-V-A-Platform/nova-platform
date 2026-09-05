"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminOverview, authService, PendingLecturer } from "@/services/auth";

type AdminTab = "overview" | "approvals" | "operations" | "integrations";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "approvals", label: "Approvals" },
  { id: "operations", label: "Operations" },
  { id: "integrations", label: "Integrations" },
];

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

  useEffect(() => {
    if (!authLoading && (!user || user.role_name !== "Admin")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOverview, nextLecturers] = await Promise.all([
        authService.getAdminOverview(),
        authService.getPendingLecturers(),
      ]);
      setOverview(nextOverview);
      setLecturers(nextLecturers);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role_name === "Admin") {
      void loadDashboard();
    }
  }, [user, loadDashboard]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const result = action === "approve"
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
        Opening the control center...
      </main>
    );
  }

  const configuredIntegrations = overview?.integrations.filter((item) => item.configured).length ?? 0;

  return (
    <main className="min-h-screen bg-[#FAF6EE] text-[#1E1E1E]">
      <header className="border-b-2 border-black bg-white px-4 py-4 shadow-[0_3px_0_0_rgba(0,0,0,1)] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="font-handwriting text-4xl font-bold text-[#E75A3D]">
              N.O.V.A.
            </Link>
            <p className="font-casual text-xs uppercase tracking-[0.16em] text-zinc-500">Administrator control center</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-handwriting text-lg font-bold">{user.first_name} {user.last_name}</p>
              <p className="font-casual text-xs text-zinc-500">Platform administrator</p>
            </div>
            <button onClick={logout} className="rounded-md border-2 border-black bg-white px-3 py-2 font-casual text-xs font-bold hover:bg-zinc-100">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="rounded-xl border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] lg:h-fit">
          <p className="px-3 pb-2 pt-1 font-casual text-[11px] font-bold uppercase tracking-wider text-zinc-500">Workspace</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-md border-2 px-3 py-2 text-left font-handwriting text-lg transition-colors ${
                  activeTab === tab.id
                    ? "border-black bg-[#E75A3D] text-white"
                    : "border-transparent hover:border-black hover:bg-[#FAF6EE]"
                }`}
              >
                {tab.label}
                {tab.id === "approvals" && lecturers.length > 0 && (
                  <span className="ml-2 rounded-full bg-[#FEF08A] px-1.5 py-0.5 font-casual text-[10px] text-black">{lecturers.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-4 rounded-lg border-2 border-dashed border-zinc-300 bg-[#FEF08A]/50 p-3 font-casual text-xs leading-relaxed text-zinc-700">
            Sensitive credentials are intentionally never shown in this dashboard.
          </div>
        </aside>

        <section className="min-w-0">
          {(message || error) && (
            <div className={`mb-5 rounded-lg border-2 p-3 font-casual text-sm ${error ? "border-red-500 bg-red-50 text-red-700" : "border-emerald-500 bg-emerald-50 text-emerald-700"}`}>
              {error || message}
            </div>
          )}

          {loading || !overview ? (
            <div className="rounded-xl border-2 border-black bg-white p-10 text-center font-handwriting text-xl shadow-[5px_5px_0_0_rgba(0,0,0,1)]">Loading live platform data...</div>
          ) : (
            <>
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
                      <div key={String(label)} className="rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                        <p className="my-1 font-handwriting text-4xl font-bold text-[#E75A3D]">{value}</p>
                        <p className="font-casual text-xs text-zinc-600">{hint}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
                    <section className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-casual text-xs uppercase tracking-wide text-zinc-500">Knowledge base</p>
                          <h2 className="font-handwriting text-2xl font-bold">Scraper status</h2>
                        </div>
                        <span className={`rounded-full px-2 py-1 font-casual text-xs font-bold ${overview.scraper.is_running ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {overview.scraper.is_running ? "Running" : "Ready"}
                        </span>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 gap-4 font-casual text-sm">
                        <div><dt className="text-zinc-500">Sources</dt><dd className="font-bold">{overview.scraper.sources}</dd></div>
                        <div><dt className="text-zinc-500">Last refresh</dt><dd className="font-bold">{formatDate(overview.scraper.last_run)}</dd></div>
                      </dl>
                      <button onClick={() => setActiveTab("operations")} className="mt-5 font-casual text-sm font-bold underline hover:text-[#E75A3D]">Manage knowledge operations →</button>
                    </section>
                    <section className="rounded-xl border-2 border-black bg-[#1E1E1E] p-5 text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <p className="font-casual text-xs uppercase tracking-wide text-zinc-400">Integration health</p>
                      <h2 className="font-handwriting text-2xl font-bold">{configuredIntegrations}/{overview.integrations.length} services configured</h2>
                      <p className="mt-3 font-casual text-sm text-zinc-300">Review which providers are available without exposing any secret value.</p>
                      <button onClick={() => setActiveTab("integrations")} className="mt-5 rounded-md border-2 border-white px-3 py-2 font-casual text-xs font-bold hover:bg-white hover:text-black">View integration health</button>
                    </section>
                  </div>
                </div>
              )}

              {activeTab === "approvals" && (
                <section className="rounded-xl border-2 border-black bg-white p-5 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div><p className="font-casual text-sm text-zinc-500">Identity & access</p><h1 className="font-handwriting text-3xl font-bold">Lecturer approval queue</h1></div>
                    <button onClick={() => void loadDashboard()} className="rounded-md border-2 border-black px-3 py-2 font-casual text-xs font-bold hover:bg-[#FAF6EE]">Refresh</button>
                  </div>
                  {lecturers.length === 0 ? <p className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center font-casual text-zinc-500">Your approval queue is clear.</p> : (
                    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="border-b-2 border-black font-handwriting text-lg"><tr><th className="p-3">Applicant</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3 text-right">Decision</th></tr></thead><tbody className="divide-y divide-zinc-200 font-casual text-sm">{lecturers.map((lecturer) => <tr key={lecturer.id}><td className="p-3 font-bold">{lecturer.first_name} {lecturer.last_name}</td><td className="p-3 font-mono text-xs">{lecturer.email}</td><td className="p-3"><span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Lecturer</span></td><td className="p-3 text-right"><button disabled={actionLoading} onClick={() => void handleAction(lecturer.id, "reject")} className="mr-2 rounded border-2 border-red-300 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-50">Reject</button><button disabled={actionLoading} onClick={() => void handleAction(lecturer.id, "approve")} className="rounded border-2 border-black bg-[#E75A3D] px-2 py-1 text-xs font-bold text-white disabled:opacity-50">Approve</button></td></tr>)}</tbody></table></div>
                  )}
                </section>
              )}

              {activeTab === "operations" && (
                <section className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <p className="font-casual text-sm text-zinc-500">Content & AI operations</p><h1 className="font-handwriting text-3xl font-bold">Knowledge base refresh</h1>
                  <div className="mt-6 rounded-xl border-2 border-black bg-[#FAF6EE] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-handwriting text-xl font-bold">UiPath source scraper</p><p className="mt-1 max-w-xl font-casual text-sm text-zinc-600">Refreshes the sources that ground study resources and AI answers. The job runs in the background and can take several minutes.</p></div><span className={`rounded-full px-3 py-1 font-casual text-xs font-bold ${overview.scraper.is_running ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{overview.scraper.is_running ? "Refresh in progress" : "Ready to refresh"}</span></div><dl className="mt-5 grid gap-4 sm:grid-cols-3 font-casual text-sm"><div><dt className="text-zinc-500">Tracked sources</dt><dd className="font-bold">{overview.scraper.sources}</dd></div><div><dt className="text-zinc-500">Indexed chunks</dt><dd className="font-bold">{overview.scraper.indexed_chunks}</dd></div><div><dt className="text-zinc-500">Last run</dt><dd className="font-bold">{formatDate(overview.scraper.last_run)}</dd></div></dl><button disabled={actionLoading || overview.scraper.is_running} onClick={() => void triggerScrape()} className="mt-6 rounded-md border-2 border-black bg-[#E75A3D] px-4 py-2 font-handwriting text-lg text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50">{overview.scraper.is_running ? "Refresh running" : "Refresh knowledge base"}</button></div>
                </section>
              )}

              {activeTab === "integrations" && (
                <div className="space-y-5"><section className="rounded-xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"><p className="font-casual text-sm text-zinc-500">Credential safety</p><h1 className="font-handwriting text-3xl font-bold">Integration health</h1><p className="mt-2 max-w-2xl font-casual text-sm leading-relaxed text-zinc-600">This screen only reports whether a provider is configured. API keys are deliberately never read back or sent to the browser.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{overview.integrations.map((integration) => <div key={integration.name} className="flex items-center justify-between rounded-lg border-2 border-black p-4"><span className="font-handwriting text-xl font-bold">{integration.name}</span><span className={`rounded-full px-2 py-1 font-casual text-xs font-bold ${integration.configured ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{integration.configured ? "Configured" : "Not configured"}</span></div>)}</div></section><section className="rounded-xl border-2 border-amber-500 bg-amber-50 p-5 font-casual text-sm leading-relaxed text-amber-950"><p className="font-handwriting text-xl font-bold">How to rotate a key safely</p><p className="mt-2">Update the secret in your deployment’s secret manager (or the backend environment file for local development), restart the backend, then confirm the provider state here. For production, use a managed secret store such as Doppler, 1Password Secrets Automation, AWS Secrets Manager, or HashiCorp Vault—never a plaintext field in an admin dashboard.</p></section></div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
