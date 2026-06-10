import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Queue AI — Escape System",
  description:
    "AI-Based Queue Prediction and Alternative Recommendation Platform for Seoul Metro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#05070a] text-white selection:bg-[#4d6fff]/30 selection:text-white relative overflow-x-hidden" suppressHydrationWarning>
        {/* Futuristic Ambient Glows */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Top Blue Glow */}
          <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-[#00d4ff]/8 blur-[130px]" />
          {/* Right Purple Glow */}
          <div className="absolute top-[20%] -right-[15%] h-[700px] w-[700px] rounded-full bg-[#8b5cf6]/6 blur-[150px]" />
          {/* Bottom Left Blue/Purple Mix */}
          <div className="absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-[#4d6fff]/5 blur-[130px]" />
        </div>

        {/* Floating Top Header is rendered inside the layout */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Header />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
