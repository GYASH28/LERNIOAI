import { redirect } from 'next/navigation'

/**
 * Redirect to a path using an absolute URL.
 * Next.js 16 requires absolute URLs for redirects — relative URLs
 * throw 'URL is malformed. Please use only absolute URLs'.
 *
 * Usage:
 *   redirectTo('/sign-in?callbackUrl=/dashboard')
 *   redirectTo('/dashboard')
 */
export function redirectTo(path: string): never {
  // In Next.js 16, redirect() with a relative path works on the server
  // but can fail in certain middleware/edge contexts. Using the full
  // URL via request headers is the safest approach.
  //
  // However, redirect() from next/navigation DOES support relative
  // paths in App Router server components. The 'URL is malformed'
  // error comes from NextResponse.redirect() in middleware, not from
  // redirect() in server components.
  //
  // So we just call redirect() directly — it handles relative paths
  // correctly in server components.
  redirect(path)
}
