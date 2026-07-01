import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import {
  QueueImportSchema,
  listSyllabusImportJobs,
  queueSyllabusImport,
} from '@/lib/syllabus/source-service'

export async function GET(request: Request) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const url = new URL(request.url)
    const result = await listSyllabusImportJobs({
      state: url.searchParams.get('state') ?? undefined,
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
    const parsed = QueueImportSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid import payload.', 400, false)
    }
    const job = await queueSyllabusImport(parsed.data, authority.user.id)
    return okResponse({ job })
  })
}
