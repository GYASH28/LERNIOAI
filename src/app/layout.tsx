import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LernioMotionProvider } from "@/components/motion";
import { GlobalExperienceRuntime } from "@/components/app/global-experience-runtime";
import { CommandPalette } from "@/components/cmdk/command-palette";
import { RouteLoadingBar } from "@/components/app/route-loading-bar";
import { RegisterSW } from "@/components/app/register-sw";
import { KeyboardShortcuts } from "@/components/app/keyboard-shortcuts";

// ──────────────────────────────────────────────────────────────────────────
// WHITE-SCREEN FLASH FIX
// ──────────────────────────────────────────────────────────────────────────
// Previously this script was loaded via <script src="/theme-no-flash.js" />
// which is a render-blocking EXTERNAL fetch. The browser had to:
//   1. Download the HTML
//   2. Hit the <script src> tag
//   3. BLOCK parsing to fetch the JS file over the network
//   4. Execute the script
//   5. Continue parsing + painting
// During step 3 the page showed a white screen.
//
// The fix: inline the script directly into the HTML head so it runs
// synchronously with ZERO network round-trip. This is the standard
// pattern used by next-themes and every theme library.
// ──────────────────────────────────────────────────────────────────────────
const themeNoFlashScript = `(function(){try{var p=null;var m=document.cookie.match(/(?:^|;\\s*)lernio-theme=([^;]+)/);if(m){p=JSON.parse(decodeURIComponent(m[1]));}if(!p&&window.localStorage){var s=localStorage.getItem('lernio-theme-prefs');if(s){p=JSON.parse(s);}}if(!p&&window.localStorage){var lg=localStorage.getItem('lernio-prefs');if(lg){var lp=JSON.parse(lg);p={};if(lp.theme==='light'||lp.theme==='dark'||lp.theme==='system'){p.appearance=lp.theme;}if(typeof lp.reducedMotion==='boolean'){p.motion=lp.reducedMotion?'reduced':'full';}if(typeof lp.lowPower==='boolean'){p.lowPower=lp.lowPower;}}}p=p||{};var app=p.appearance||'system';var pal=p.palette||'aurora';var con=p.contrast||'normal';var den=p.density||'comfortable';var sur=p.surfaceStyle||'soft';var sti=p.subjectTint||'subtle';var mot=p.motion||'full';var lpw=!!p.lowPower;var osRed=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(osRed&&mot!=='none'){mot='reduced';}var dark=app==='dark'||(app==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.classList.toggle('reduce-motion',mot!=='full');r.setAttribute('data-appearance',app);r.setAttribute('data-palette',pal);r.setAttribute('data-contrast',con);r.setAttribute('data-density',den);r.setAttribute('data-surface',sur);r.setAttribute('data-subject-tint',sti);r.setAttribute('data-motion',mot);r.setAttribute('data-low-power',String(lpw));}catch(e){}})();`;

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
    <html
      lang="en"
      suppressHydrationWarning
      data-palette="aurora"
      data-appearance="system"
      data-contrast="normal"
      data-density="comfortable"
      data-surface="soft"
      data-subject-tint="subtle"
      data-motion="full"
      data-low-power="false"
    >
      <head>
        {/* Inline theme-no-flash script — runs synchronously before paint.
            Previously this was <script src="/theme-no-flash.js" /> which
            caused a white-screen flash due to the network round-trip. */}
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <LernioMotionProvider>
            <RouteLoadingBar />
            {children}
            <GlobalExperienceRuntime />
            <CommandPalette />
            <KeyboardShortcuts />
            <RegisterSW />
          </LernioMotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
