import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "N.O.V.A. - Next-gen Optimized Virtual Assistant",
  description: "Transforming classrooms into intelligent, interactive learning environments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-casual">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
