/**
 * POST /api/materials/download
 *
 * Increments the download counter for a public Resource. The actual file
 * download is handled client-side (window.open / blob) — this endpoint just
 * records the analytics event so the Materials browse feed can show accurate
 * download counts.
 *
 * Body: { resourceId: string }
 *
 * Trust model: requireUser() enforces auth. The resource must exist and be
 * public — no increment on private/unpublished rows.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'

const downloadSchema = z.object({
  resourceId: z.string().min(1),
})

export const POST = (req: NextRequest) =>
  withApi(async () => {
    await requireUser()
    const body = await parseBody(req, downloadSchema)

    // Only increment for public resources — never expose private/unpublished
    // download counts.
    const existing = await db.resource.findFirst({
      where: { id: body.resourceId, visibility: 'public' },
      select: { id: true },
    })
    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Resource not found.', 404, false)
    }

    const updated = await db.resource.update({
      where: { id: body.resourceId },
      data: { downloads: { increment: 1 } },
      select: { id: true, downloads: true },
    })

    return okResponse(updated)
  })
