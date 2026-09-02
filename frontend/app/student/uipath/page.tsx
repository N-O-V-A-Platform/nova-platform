"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UiPathRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center font-handwriting text-2xl">
      Redirecting to Student Dashboard...
    </div>
  );
}
