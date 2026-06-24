import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { completeCampusProfile } from '@/lib/campus-registration'

export async function PATCH(request: Request) {
  return withApi(async () => {
    const authUser = await requireUser()
    const body = await request.json().catch(() => null)
    if (!body) {
      throw new ApiError('INVALID_REQUEST', 'Enter the required profile details.', 400, false)
    }

    try {
      const user = await completeCampusProfile(authUser.id, body)
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
      const message = error instanceof Error ? error.message : 'Could not complete this profile.'
      throw new ApiError('PROFILE_UPDATE_FAILED', message, 400, false)
    }
  })
}
