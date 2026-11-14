"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SplashLoader from "@/app/components/SplashLoader";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AuthAppWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({
    active: false,
    message: "",
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/maintenance-status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMaintenance({
            active: Boolean(data.maintenance_mode),
            message: data.message || "Scheduled system upgrade in progress.",
          });
        }
      } catch (e) {
        // Fallback: normal operation if unreachable
      } finally {
        setChecking(false);
      }
    };

    checkMaintenance();
  }, [pathname]);

  if (loading || checking) {
    return <SplashLoader />;
  }

  // Exempt administrators and the /admin or /login routes from maintenance blocking
  const isAdminUser = user?.role_name === "Admin";
  const isAdminRoute = pathname?.startsWith("/admin") || pathname === "/login";

  if (maintenance.active && !isAdminUser && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] text-[#1E1E1E] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-lg w-full bg-white border-2 border-black rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#FEF08A] border-2 border-black flex items-center justify-center text-3xl mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            🚧
          </div>
          <h1 className="text-3xl font-bold font-handwriting text-[#E75A3D]">
            System Maintenance Underway
          </h1>
          <p className="font-casual text-sm text-zinc-600 leading-relaxed">
            {maintenance.message}
          </p>
          <div className="pt-4 border-t-2 border-black/10 text-xs font-mono text-zinc-500">
            N.O.V.A. Autonomous Engine Upgrade • Please check back shortly.
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-[11px] font-mono text-zinc-400 hover:text-black underline"
            >
              Administrator Access Portal ➔
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
