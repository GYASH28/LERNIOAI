import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import {
  UpsertResourceProviderSchema,
  listResourceProviders,
  upsertResourceProvider,
} from '@/lib/resources/resource-governance'

export async function GET() {
  return withApi(async () => {
    await requireActiveRole('admin')
    const providers = await listResourceProviders()
    return okResponse({ providers })
  })
}

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    const parsed = UpsertResourceProviderSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid provider payload.', 400, false)
    }
    const provider = await upsertResourceProvider(parsed.data, authority.user.id)
    return okResponse({ provider })
  })
}
