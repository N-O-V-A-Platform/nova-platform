"use client";

import { Patrick_Hand, Architects_Daughter, Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import SplashLoader from "@/app/components/SplashLoader";

const patrickHand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-patrick-hand",
  display: "swap",
});

const architectsDaughter = Architects_Daughter({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-architects-daughter",
  display: "swap",
});

const caveat = Caveat({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

function AuthAppWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <SplashLoader />;
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${patrickHand.variable} ${architectsDaughter.variable} ${caveat.variable}`}>
      <body className="min-h-full flex flex-col font-casual">
        <AuthProvider>
          <AuthAppWrapper>{children}</AuthAppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
