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
  alternates: {
    canonical: "/",
  },
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
    card: "summary",
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

/**
 * Pre-hydration no-flash script.
 *
 * Reads the `lernio-theme` cookie (written by ThemeProvider on
 * every pref change) and reflects all preferences onto <html>
 * as data-attributes + the legacy `.dark` class BEFORE React
 * hydrates. This eliminates the theme flash that the audit
 * (item 4.8) flagged.
 *
 * Falls back to localStorage (`lernio-theme-prefs`, then legacy
 * `lernio-prefs` for one-time migration) when the cookie isn't
 * present yet (first visit). Idempotent and safe to re-run.
 *
 * Kept hand-minified and dependency-free so it can run inline
 * in <head> without waiting for any chunk to load.
 */
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var p = null;
    var match = document.cookie.match(/(?:^|;\\s*)lernio-theme=([^;]+)/);
    if (match) {
      p = JSON.parse(decodeURIComponent(match[1]));
    }

    if (!p && window.localStorage) {
      var stored = localStorage.getItem('lernio-theme-prefs');
      if (stored) {
        p = JSON.parse(stored);
      }
    }

    if (!p && window.localStorage) {
      var legacy = localStorage.getItem('lernio-prefs');
      if (legacy) {
        var lp = JSON.parse(legacy);
        p = {};
        if (lp.theme === 'light' || lp.theme === 'dark' || lp.theme === 'system') {
          p.appearance = lp.theme;
        }
        if (typeof lp.reducedMotion === 'boolean') {
          p.motion = lp.reducedMotion ? 'reduced' : 'full';
        }
        if (typeof lp.lowPower === 'boolean') {
          p.lowPower = lp.lowPower;
        }
      }
    }

    p = p || {};
    var app = p.appearance || 'system';
    var pal = p.palette || 'aurora';
    var con = p.contrast || 'normal';
    var den = p.density || 'comfortable';
    var sur = p.surfaceStyle || 'soft';
    var sti = p.subjectTint || 'subtle';
    var mot = p.motion || 'full';
    var lpw = !!p.lowPower;
    var osRed = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (osRed && mot !== 'none') {
      mot = 'reduced';
    }
    var dark = app === 'dark' || (app === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var r = document.documentElement;
    r.classList.toggle('dark', dark);
    r.classList.toggle('reduce-motion', mot !== 'full');
    r.setAttribute('data-appearance', app);
    r.setAttribute('data-palette', pal);
    r.setAttribute('data-contrast', con);
    r.setAttribute('data-density', den);
    r.setAttribute('data-surface', sur);
    r.setAttribute('data-subject-tint', sti);
    r.setAttribute('data-motion', mot);
    r.setAttribute('data-low-power', String(lpw));
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
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
