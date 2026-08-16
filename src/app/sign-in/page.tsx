import { SignInForm } from '@/components/auth/sign-in-form'
import { safeCallbackPath } from '@/lib/auth-policy'

type SearchValue = string | string[] | undefined

type SignInSearchParams = {
  callbackUrl?: SearchValue
  verified?: SearchValue
  error?: SearchValue
}

function first(value: SearchValue): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SignInSearchParams>
}) {
  const params = await searchParams
  const callbackPath = safeCallbackPath(first(params.callbackUrl), '/dashboard')

  return (
    <SignInForm
      callbackPath={callbackPath}
      verified={first(params.verified)}
      routeError={first(params.error)}
    />
  )
}
