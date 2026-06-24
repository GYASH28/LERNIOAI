/**
 * Client-side sound utility.
 *
 * Uses the Web Audio API to synthesise short notification beeps — no audio
 * files needed (sandbox-friendly). All sounds are gated behind the user's
 * `soundEnabled` preference, which lives in the theme provider.
 *
 * Currently used for: achievement toasts (a short ascending arpeggio).
 */

type BeepOptions = {
  freq: number
  durationMs?: number
  type?: OscillatorType
  gain?: number
  /** Delay before this beep starts (ms). Used to chain notes. */
  delayMs?: number
}

let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (_ctx) return _ctx
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    _ctx = new Ctor()
  } catch {
    _ctx = null
  }
  return _ctx
}

function playBeep(ctx: AudioContext, opts: BeepOptions) {
  const {
    freq,
    durationMs = 180,
    type = 'sine',
    gain = 0.12,
    delayMs = 0,
  } = opts
  const start = ctx.currentTime + delayMs / 1000
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  // Quick attack + exponential decay (no clicks).
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000)
  osc.connect(g).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + durationMs / 1000 + 0.02)
}

/**
 * Play the achievement sound — a short ascending C-E-G arpeggio.
 * Silently no-ops if Web Audio is unavailable or `enabled` is false.
 */
export function playAchievementSound(enabled: boolean) {
  if (!enabled) return
  const ctx = getCtx()
  if (!ctx) return
  // Some browsers suspend the context until a user gesture; resume defensively.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  // Ascending C5-E5-G5 arpeggio (523.25, 659.25, 783.99 Hz).
  playBeep(ctx, { freq: 523.25, durationMs: 140, delayMs: 0 })
  playBeep(ctx, { freq: 659.25, durationMs: 140, delayMs: 120 })
  playBeep(ctx, { freq: 783.99, durationMs: 240, delayMs: 240 })
}

/**
 * Play a soft click sound for primary button presses (kept very quiet).
 */
export function playClickSound(enabled: boolean) {
  if (!enabled) return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  playBeep(ctx, { freq: 440, durationMs: 80, type: 'triangle', gain: 0.06 })
}
