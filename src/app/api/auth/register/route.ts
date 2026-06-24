import { registerCampusUser } from '@/lib/campus-registration'
import { ApiError, okResponse, withApi } from '@/lib/auth'

export async function POST(request: Request) {
  return withApi(async () => {
    const body = await request.json().catch(() => null)
    if (!body) {
      throw new ApiError('INVALID_REQUEST', 'Enter the required signup details.', 400, false)
    }

    try {
      const user = await registerCampusUser(body)
      return okResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileComplete: user.profileComplete,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create this account.'
      throw new ApiError('SIGNUP_FAILED', message, 400, false)
    }
  })
}
