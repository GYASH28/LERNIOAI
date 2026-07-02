const SEEK_TOLERANCE_SECONDS = 5
const SEEK_JUMP_MIN_SECONDS = 30

export interface VideoCreditInput {
  previousLastSecond: number
  previousWatchedSeconds: number
  previousCompletedAt: Date | null
  previousUpdatedAt: Date | null
  currentSecond: number
  durationSeconds: number | null
  now: Date
}

export interface VideoCreditResult {
  lastSecond: number
  watchedSeconds: number
  watchPercent: number
  completedAt: Date | null
  creditedDeltaSeconds: number
  creditRejectedReason: 'seek_jump' | 'no_prior_state' | null
}

export function calculateVideoCredit(input: VideoCreditInput): VideoCreditResult {
  const durationSeconds = positiveIntOrNull(input.durationSeconds)
  const previousLastSecond = clampNonNegative(input.previousLastSecond)
  const previousWatchedSeconds = clampNonNegative(input.previousWatchedSeconds)
  const lastSecond = durationSeconds
    ? Math.min(clampNonNegative(input.currentSecond), durationSeconds)
    : clampNonNegative(input.currentSecond)

  const credit = creditedDelta({
    previousLastSecond,
    previousUpdatedAt: input.previousUpdatedAt,
    lastSecond,
    now: input.now,
  })
  const watchedSeconds = durationSeconds
    ? Math.min(durationSeconds, previousWatchedSeconds + credit.delta)
    : previousWatchedSeconds + credit.delta
  const watchPercent = durationSeconds ? Math.min(100, (watchedSeconds / durationSeconds) * 100) : 0
  const completedAt = watchPercent >= 95 ? input.previousCompletedAt ?? input.now : input.previousCompletedAt

  return {
    lastSecond,
    watchedSeconds,
    watchPercent,
    completedAt,
    creditedDeltaSeconds: credit.delta,
    creditRejectedReason: credit.reason,
  }
}

function creditedDelta(input: {
  previousLastSecond: number
  previousUpdatedAt: Date | null
  lastSecond: number
  now: Date
}): { delta: number; reason: VideoCreditResult['creditRejectedReason'] } {
  if (!input.previousUpdatedAt) return { delta: 0, reason: 'no_prior_state' }

  const positionDelta = input.lastSecond - input.previousLastSecond
  if (positionDelta <= 0) return { delta: 0, reason: null }

  const elapsedSeconds = Math.max(0, Math.floor((input.now.getTime() - input.previousUpdatedAt.getTime()) / 1000))
  const allowedDelta = elapsedSeconds + SEEK_TOLERANCE_SECONDS
  const likelySeekJump = positionDelta > Math.max(SEEK_JUMP_MIN_SECONDS, allowedDelta * 2)
  if (likelySeekJump) return { delta: 0, reason: 'seek_jump' }

  return { delta: Math.min(positionDelta, allowedDelta), reason: null }
}

function clampNonNegative(value: number | null | undefined): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? Number(value) : 0))
}

function positiveIntOrNull(value: number | null | undefined): number | null {
  const normalized = clampNonNegative(value)
  return normalized > 0 ? normalized : null
}
