'use client'

import { usePathname } from 'next/navigation'

const HIDDEN_PREFIXES = ['/', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/privacy', '/terms']

function shouldHide(pathname: string) {
  if (pathname === '/') return true
  return HIDDEN_PREFIXES.slice(1).some((prefix) => pathname.startsWith(prefix))
}

export function RouteVisualLayer() {
  const pathname = usePathname() || '/'
  if (shouldHide(pathname)) return null

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_18%_8%,hsl(var(--primary)/0.13),transparent_34%),radial-gradient(circle_at_82%_4%,hsl(var(--accent-foreground)/0.08),transparent_30%)]" />
        <svg className="absolute right-[4%] top-24 h-40 w-40 text-primary opacity-[0.055]" viewBox="0 0 160 160" fill="none">
          <circle cx="80" cy="80" r="58" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" />
          <circle cx="80" cy="80" r="28" stroke="currentColor" strokeWidth="2" />
          <path d="M80 18V42M80 118V142M18 80H42M118 80H142" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <svg className="absolute bottom-28 left-[3%] h-48 w-48 text-primary opacity-[0.04]" viewBox="0 0 200 200" fill="none">
          <path d="M24 146C54 126 70 75 105 87C144 100 151 45 178 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="25" cy="146" r="8" fill="currentColor" />
          <circle cx="105" cy="87" r="8" fill="currentColor" />
          <circle cx="178" cy="55" r="8" fill="currentColor" />
        </svg>
      </div>
      <style jsx global>{`
        @keyframes learningFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  )
}
