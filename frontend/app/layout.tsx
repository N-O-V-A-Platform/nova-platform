import type { Metadata } from "next";
import { Patrick_Hand, Architects_Daughter, Caveat } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers";

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

export const metadata: Metadata = {
  title: "N.O.V.A. - Next-gen AI Educator & Adaptive Learning Studio",
  description: "Transforming classrooms into intelligent, interactive learning environments with personalized AI Teachers, dynamic visual canvases, and real-time misconception detection.",
  keywords: ["AI Teacher", "Adaptive Learning", "Pedagogical RAG", "Education AI", "Misconception Engine", "N.O.V.A"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${patrickHand.variable} ${architectsDaughter.variable} ${caveat.variable}`}>
      <body className="min-h-full flex flex-col font-casual">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
