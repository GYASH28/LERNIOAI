'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, BrainCircuit, PenTool, RotateCcw, SkipForward } from 'lucide-react'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import {
  HYPERFRAMES_INTRO_STORAGE_KEY,
  HYPERFRAMES_INTRO_TIMING,
} from '@/lib/motion/hyperframes-intro'

function safeSeen() {
  try {
    return window.sessionStorage.getItem(HYPERFRAMES_INTRO_STORAGE_KEY) === 'complete'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(HYPERFRAMES_INTRO_STORAGE_KEY, 'complete')
  } catch {
    // Session storage is optional. The intro still exits safely.
  }
}

function resolveDuration() {
  const root = document.documentElement
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    root.dataset.motion === 'reduced' ||
    root.dataset.motion === 'none'
  if (reduced) return HYPERFRAMES_INTRO_TIMING.reduced

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  const constrained =
    root.dataset.lowPower === 'true' ||
    connection?.saveData === true ||
    connection?.effectiveType === '2g' ||
    connection?.effectiveType === 'slow-2g'

  return constrained || window.innerWidth < 640
    ? HYPERFRAMES_INTRO_TIMING.compact
    : HYPERFRAMES_INTRO_TIMING.full
}

export function HyperframesIntro() {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)
  const [duration, setDuration] = useState(HYPERFRAMES_INTRO_TIMING.full)
  const timerRef = useRef<number | null>(null)
  const exitTimerRef = useRef<number | null>(null)

  const complete = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (exitTimerRef.current) return

    markSeen()
    setExiting(true)
    document.documentElement.dataset.landingIntro = 'handoff'

    exitTimerRef.current = window.setTimeout(() => {
      document.documentElement.dataset.landingIntro = 'complete'
      window.dispatchEvent(new CustomEvent('lernio:intro-complete'))
      setVisible(false)
      exitTimerRef.current = null
    }, 420)
  }, [])

  useEffect(() => {
    if (safeSeen() || document.documentElement.dataset.landingIntro === 'complete') {
      setVisible(false)
      return
    }

    const nextDuration = resolveDuration()
    setDuration(nextDuration)
    document.documentElement.dataset.landingIntro = 'playing'
    timerRef.current = window.setTimeout(complete, nextDuration)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current)
    }
  }, [complete])

  if (!visible) return null

  const speed = duration / HYPERFRAMES_INTRO_TIMING.full
  const timingStyle = {
    '--intro-duration': `${duration}ms`,
    '--ring-one-duration': `${Math.max(600, Math.round(1600 * speed))}ms`,
    '--ring-two-duration': `${Math.max(560, Math.round(1500 * speed))}ms`,
    '--ring-three-duration': `${Math.max(520, Math.round(1300 * speed))}ms`,
    '--core-duration': `${Math.max(460, Math.round(1100 * speed))}ms`,
    '--card-duration': `${Math.max(420, Math.round(820 * speed))}ms`,
    '--lockup-duration': `${Math.max(420, Math.round(820 * speed))}ms`,
    '--lockup-delay': `${Math.round(2450 * speed)}ms`,
  } as React.CSSProperties

  return (
    <div
      data-hyperframes-intro
      data-exiting={exiting ? 'true' : 'false'}
      className="fixed inset-0 z-[120] overflow-hidden bg-[#050713] text-white"
      style={timingStyle}
      role="dialog"
      aria-label="Lernio opening sequence"
      aria-modal="true"
    >
      <div className="hf-grid absolute inset-0" />
      <div className="hf-orb hf-orb-a" />
      <div className="hf-orb hf-orb-b" />
      <div className="hf-beam" />

      <button
        type="button"
        onClick={complete}
        className="absolute right-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-bold text-white/85 backdrop-blur-md transition hover:bg-white/15 sm:right-6 sm:top-6"
      >
        Skip <SkipForward className="h-4 w-4" />
      </button>

      <div className="relative z-10 grid min-h-full place-items-center px-5">
        <div className="relative h-[440px] w-full max-w-5xl sm:h-[520px]">
          <section className="hf-scene hf-scene-signal absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-300/80">Your academic workspace is waking up</p>
              <div className="relative mx-auto mt-8 h-52 w-52 sm:h-64 sm:w-64">
                <div className="hf-ring hf-ring-one" />
                <div className="hf-ring hf-ring-two" />
                <div className="hf-ring hf-ring-three" />
                <div className="hf-core absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-[1.7rem] border border-white/20 bg-white/10 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl sm:h-28 sm:w-28">
                  <LernioLogoTile className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
              </div>
            </div>
          </section>

          <section className="hf-scene hf-scene-system absolute inset-0 grid place-items-center">
            <div className="w-full">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-300/80">One connected learning system</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Learn → practise → revise → understand</h2>
              </div>
              <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <MotionCard icon={BookOpen} label="Learn" helper="One clear lesson" delayMs={Math.round(1180 * speed)} />
                <MotionCard icon={PenTool} label="Practise" helper="Find the gap" delayMs={Math.round(1270 * speed)} />
                <MotionCard icon={RotateCcw} label="Revise" helper="Recall on time" delayMs={Math.round(1360 * speed)} />
                <MotionCard icon={BrainCircuit} label="Ask LEO" helper="Explain differently" delayMs={Math.round(1450 * speed)} />
              </div>
            </div>
          </section>

          <section className="hf-scene hf-scene-wordmark absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="hf-logo-lockup mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl shadow-violet-500/20 backdrop-blur-xl sm:h-28 sm:w-28">
                <LernioLogoTile className="h-16 w-16 sm:h-20 sm:w-20" />
              </div>
              <h1 className="mt-7 text-5xl font-black tracking-[-0.06em] sm:text-7xl">LERNIO</h1>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.28em] text-cyan-300 sm:text-sm">Learning OS for diploma students</p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">A calmer path through lessons, practice, revision and exams.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 z-20 mx-auto max-w-3xl sm:bottom-8">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="hf-progress h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400" />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          <span>Signal</span><span>System</span><span>Start</span>
        </div>
      </div>

      <style jsx global>{`
        html[data-landing-intro='pending'] [data-landing-content],
        html[data-landing-intro='playing'] [data-landing-content] {
          visibility: hidden;
        }
        html[data-landing-intro='complete'] [data-hyperframes-intro] {
          display: none;
        }
        [data-hyperframes-intro][data-exiting='true'] {
          animation: hfExit 420ms cubic-bezier(.2,.8,.2,1) both;
        }
        .hf-grid {
          opacity: .32;
          background-image:
            linear-gradient(rgba(103,232,249,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(103,232,249,.07) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
          animation: hfGrid var(--intro-duration) linear both;
        }
        .hf-orb { position:absolute; border-radius:999px; filter:blur(75px); opacity:.36; }
        .hf-orb-a { width:38vw; height:38vw; left:-12vw; top:-14vw; background:#06b6d4; animation:hfOrbA var(--intro-duration) ease-in-out both; }
        .hf-orb-b { width:42vw; height:42vw; right:-14vw; bottom:-18vw; background:#8b5cf6; animation:hfOrbB var(--intro-duration) ease-in-out both; }
        .hf-beam { position:absolute; inset:-20% 47%; width:7%; transform:rotate(20deg); background:linear-gradient(180deg,transparent,rgba(255,255,255,.13),transparent); filter:blur(12px); animation:hfBeam var(--intro-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-scene { opacity:0; }
        .hf-scene-signal { animation:hfSignal var(--intro-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-scene-system { animation:hfSystem var(--intro-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-scene-wordmark { animation:hfWordmark var(--intro-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-ring { position:absolute; inset:0; margin:auto; border-radius:999px; border:1px solid rgba(103,232,249,.36); }
        .hf-ring-one { width:100%; height:100%; animation:hfRingOne var(--ring-one-duration) ease-out infinite; }
        .hf-ring-two { width:76%; height:76%; animation:hfRingTwo var(--ring-two-duration) ease-out infinite; }
        .hf-ring-three { width:52%; height:52%; border-color:rgba(196,181,253,.55); animation:hfRingThree var(--ring-three-duration) ease-out infinite; }
        .hf-core { animation:hfCore var(--core-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-motion-card { animation:hfCard var(--card-duration) cubic-bezier(.2,.8,.2,1) both; }
        .hf-logo-lockup { animation:hfLockup var(--lockup-duration) cubic-bezier(.2,.8,.2,1) both; animation-delay:var(--lockup-delay); }
        .hf-progress { transform-origin:left; animation:hfProgress var(--intro-duration) linear both; }
        @keyframes hfSignal { 0%{opacity:0;transform:scale(.94)} 8%{opacity:1;transform:scale(1)} 31%{opacity:1;transform:scale(1)} 41%{opacity:0;transform:scale(1.04)} 100%{opacity:0} }
        @keyframes hfSystem { 0%,30%{opacity:0;transform:translateY(18px)} 42%{opacity:1;transform:translateY(0)} 69%{opacity:1;transform:translateY(0)} 78%{opacity:0;transform:translateY(-12px)} 100%{opacity:0} }
        @keyframes hfWordmark { 0%,68%{opacity:0;transform:scale(.97)} 80%{opacity:1;transform:scale(1)} 94%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.015)} }
        @keyframes hfCore { 0%{opacity:0;transform:scale(.72) rotate(-8deg)} 65%{opacity:1;transform:scale(1.04) rotate(1deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes hfRingOne { 0%{opacity:0;transform:scale(.55)} 35%{opacity:.8} 100%{opacity:0;transform:scale(1.14)} }
        @keyframes hfRingTwo { 0%{opacity:0;transform:scale(.58)} 35%{opacity:.75} 100%{opacity:0;transform:scale(1.2)} }
        @keyframes hfRingThree { 0%,100%{opacity:.45;transform:scale(.92)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes hfCard { 0%{opacity:0;transform:translateY(24px) scale(.94)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes hfLockup { 0%{opacity:0;transform:scale(.72) rotate(-8deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes hfProgress { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes hfGrid { 0%{transform:scale(1.05);opacity:0} 20%{opacity:.32} 100%{transform:scale(1);opacity:.12} }
        @keyframes hfOrbA { 0%{transform:translate(-8%,-8%) scale(.8)} 100%{transform:translate(35%,24%) scale(1.12)} }
        @keyframes hfOrbB { 0%{transform:translate(12%,15%) scale(.85)} 100%{transform:translate(-34%,-22%) scale(1.08)} }
        @keyframes hfBeam { 0%{transform:translateX(-44vw) rotate(20deg);opacity:0} 18%{opacity:1} 100%{transform:translateX(48vw) rotate(20deg);opacity:0} }
        @keyframes hfExit { from{opacity:1;clip-path:inset(0 0 0 0 round 0)} to{opacity:0;clip-path:inset(0 0 100% 0 round 0 0 40px 40px)} }
        @media (prefers-reduced-motion: reduce) {
          .hf-grid,.hf-orb,.hf-beam,.hf-ring,.hf-core,.hf-motion-card,.hf-logo-lockup,.hf-progress,.hf-scene { animation-duration:1ms !important; animation-delay:0ms !important; }
          .hf-scene-signal,.hf-scene-system { display:none; }
          .hf-scene-wordmark { opacity:1; }
        }
      `}</style>
    </div>
  )
}

function MotionCard({
  icon: Icon,
  label,
  helper,
  delayMs,
}: {
  icon: typeof BookOpen
  label: string
  helper: string
  delayMs: number
}) {
  return (
    <div
      className="hf-motion-card rounded-2xl border border-white/12 bg-white/[0.07] p-4 text-left shadow-xl shadow-black/20 backdrop-blur-xl sm:p-5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200"><Icon className="h-5 w-5" /></span>
      <p className="mt-4 font-black">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
    </div>
  )
}
