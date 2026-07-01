import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, parseBody } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withApi(async () => {
  const user = await getCurrentUser()
  const recent = await db.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: 'desc' },
    take: 10,
  })
  return okResponse(recent)
})

export const POST = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const body = await parseBody(req, {
    resourceType: 'string',
    resourceId: 'string',
    title: 'string',
    href: 'string',
    scrollPos: 'number?',
  })
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
