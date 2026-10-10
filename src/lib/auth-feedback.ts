/**
 * Keep credential errors useful without revealing whether an account exists.
 * An unavailable auth service must not masquerade as a bad password.
 */
export const AUTH_SERVICE_UNAVAILABLE = 'LernioAuthenticationUnavailable'

type SignInResult = { error?: string | null; ok?: boolean } | null | undefined

export function credentialSignInError(result: SignInResult): string | null {
  if (!result) {
    return 'Could not contact the sign-in service. Check your connection and try again.'
  }

  if (result.error === 'CredentialsSignin') {
    return 'Invalid email or password.'
  }

  if (result.error || result.ok === false) {
    return 'Sign-in is temporarily unavailable. Please try again shortly.'
  }

  return null
}

export function signInRouteError(error: string | null): string {
  if (error === 'CredentialsSignin') return 'Invalid email or password.'
  if (error === AUTH_SERVICE_UNAVAILABLE || error === 'Callback') {
    return 'Sign-in is temporarily unavailable. Please try again shortly.'
  }
  return 'Your session could not be verified. Please sign in again.'
}
