import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import {
  CreateSyllabusSourceSchema,
  createSyllabusSource,
  listSyllabusSources,
} from '@/lib/syllabus/source-service'

export async function GET(request: Request) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const url = new URL(request.url)
    const result = await listSyllabusSources({
      q: url.searchParams.get('q') ?? undefined,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 20),
    })
    return okResponse(result)
  })
}

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    const parsed = CreateSyllabusSourceSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid source payload.', 400, false)
    }
    const source = await createSyllabusSource(parsed.data, authority.user.id)
    return okResponse({ source })
  })
}
