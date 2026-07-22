"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import SplashLoader from "@/app/components/SplashLoader";

export default function AuthAppWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <SplashLoader />;
  }

  return <>{children}</>;
}
