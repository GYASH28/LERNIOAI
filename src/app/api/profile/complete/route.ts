import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { completeCampusProfile } from '@/lib/campus-registration'
import { toPublicUserDTO } from '@/lib/user-dto'

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
        user: toPublicUserDTO(user),
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError('PROFILE_UPDATE_FAILED', 'Could not complete this profile. Check the fields and try again.', 400, false)
    }
  })
}
