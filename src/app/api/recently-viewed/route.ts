import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const trackViewSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  title: z.string().min(1),
  href: z.string().min(1),
  scrollPos: z.number().optional(),
})

export function GET() {
  return withApi(async () => {
    const user = await getCurrentUser()
    const recent = await db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: 'desc' },
      take: 10,
    })
    return okResponse(recent)
  })
}

export function POST(request: Request) {
  return withApi(async () => {
    const user = await getCurrentUser()
    const body = await parseBody(request, trackViewSchema)
    const recent = await db.recentlyViewed.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId: user.id,
          resourceType: body.resourceType,
          resourceId: body.resourceId,
        },
      },
      create: {
        userId: user.id,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        title: body.title,
        href: body.href,
        scrollPos: body.scrollPos ?? 0,
      },
      update: {
        title: body.title,
        href: body.href,
        scrollPos: body.scrollPos ?? 0,
        viewedAt: new Date(),
      },
    })
    return okResponse(recent)
  })
}
