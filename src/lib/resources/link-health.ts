export type LinkHealthStatus = 'healthy' | 'redirected' | 'stale' | 'unhealthy' | 'unknown'

export interface LinkHealthCheckResult {
  checkedAt: string
  url: string
  finalUrl: string | null
  status: LinkHealthStatus
  httpStatus: number | null
  errorMessage?: string
}

export function classifyLinkHealth(input: {
  httpStatus: number | null
  finalUrl?: string | null
  originalUrl?: string | null
  errorMessage?: string | null
}): LinkHealthStatus {
  if (input.httpStatus === null) return 'unknown'
  if (input.httpStatus === 404 || input.httpStatus === 410) return 'stale'
  if (input.httpStatus >= 200 && input.httpStatus < 300) {
    return urlsDiffer(input.originalUrl, input.finalUrl) ? 'redirected' : 'healthy'
  }
  if (input.httpStatus >= 300 && input.httpStatus < 400) return 'redirected'
  if (input.httpStatus >= 400) return 'unhealthy'
  return 'unknown'
}

export function summarizeLinkHealth(results: LinkHealthCheckResult[]) {
  return {
    checked: results.length,
    healthy: results.filter((result) => result.status === 'healthy').length,
    redirected: results.filter((result) => result.status === 'redirected').length,
    stale: results.filter((result) => result.status === 'stale').length,
    unhealthy: results.filter((result) => result.status === 'unhealthy').length,
    unknown: results.filter((result) => result.status === 'unknown').length,
  }
}

function urlsDiffer(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return normalizeUrlForCompare(a) !== normalizeUrlForCompare(b)
}

function normalizeUrlForCompare(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim().replace(/\/$/, '')
  }
}
