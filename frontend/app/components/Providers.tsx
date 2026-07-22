"use client";

import { AuthProvider } from "@/context/AuthContext";
import AuthAppWrapper from "@/app/components/AuthAppWrapper";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthAppWrapper>{children}</AuthAppWrapper>
    </AuthProvider>
  );
}
