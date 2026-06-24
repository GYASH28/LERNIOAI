export type AuthMode =
  | { mode: 'demo' }
  | { mode: 'session'; email: string }
  | { mode: 'unauthenticated' }

export interface AuthModeInput {
  demoModeEnv: string | undefined
  sessionEmail: string | null | undefined
}

export function resolveAuthMode(input: AuthModeInput): AuthMode {
  if (input.sessionEmail) {
    return { mode: 'session', email: input.sessionEmail }
  }

  if (input.demoModeEnv === 'true') {
    return { mode: 'demo' }
  }

  return { mode: 'unauthenticated' }
}
