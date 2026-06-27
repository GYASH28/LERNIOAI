/* eslint-disable @next/next/no-sync-scripts -- Theme bootstrap must run before first paint. */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LernioMotionProvider } from "@/components/motion";
import { GlobalExperienceRuntime } from "@/components/app/global-experience-runtime";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://lernioai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lernio AI — Adaptive learning for diploma students",
    template: "%s · Lernio AI",
  },
  description:
    "Lernio helps diploma students understand difficult topics, practise intelligently, revise weak areas and prepare for exams — from one personalised learning workspace.",
  keywords: [
    "Lernio AI",
    "learning platform",
    "diploma",
    "CWIT Pune",
    "data structures",
    "C++",
    "microprocessors",
    "data communication",
    "adaptive learning",
    "exam preparation",
  ],
  authors: [{ name: "Lernio AI" }],
  creator: "Lernio AI",
  icons: {
    icon: [
      { url: "/brand/lernio-logo-transparent.svg", type: "image/svg+xml" },
      { url: "/brand/lernio-logo-symbol.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/lernio-logo-symbol.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Lernio AI — Adaptive learning for diploma students",
    description:
      "Understand faster. Practise smarter. Walk into exams prepared. One personalised learning workspace for diploma engineering students.",
    siteName: "Lernio AI",
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: "/brand/lernio-logo-transparent.png",
        width: 1200,
        height: 1541,
        alt: "Lernio AI logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lernio AI — Adaptive learning for diploma students",
    description:
      "Understand faster. Practise smarter. Walk into exams prepared. One personalised learning workspace for diploma engineering students.",
    images: ["/brand/lernio-logo-transparent.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-no-flash.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <LernioMotionProvider>
            {children}
            <GlobalExperienceRuntime />
          </LernioMotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
