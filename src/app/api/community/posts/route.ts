import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createPostSchema = z.object({
  section: z.enum(['discussion', 'feed', 'group']),
  title: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1).max(5000),
  postType: z.string().default('freeform'),
  subjectId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const section = searchParams.get('section') || 'discussion'
    const wide = searchParams.get('wide') === 'true'

    if (section === 'groups') {
      // Fetch study groups for the user's semester/subjects
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { departmentCode: true, semesterNumber: true },
      })
      const groups = await db.communityGroup.findMany({
        where: {
          OR: [
            { semesterNumber: dbUser?.semesterNumber ?? 3 },
            { memberships: { some: { userId: user.id } } },
          ],
        },
        include: {
          _count: { select: { memberships: true } },
          memberships: { where: { userId: user.id }, select: { id: true } },
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      })
      return okResponse({
        groups: groups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          subjectName: g.subjectId,
          semesterNumber: g.semesterNumber,
          memberCount: g._count.memberships,
          visibility: g.visibility,
          isMember: g.memberships.length > 0,
        })),
      })
    }

    // Fetch posts
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { departmentCode: true, semesterNumber: true },
    })

    const posts = await db.communityPost.findMany({
      where: {
        section: section === 'discussions' ? 'discussion' : section,
        status: 'published',
        ...(wide ? {} : {
          author: { departmentCode: dbUser?.departmentCode },
        }),
      },
      include: {
        author: { select: { name: true, departmentCode: true, semesterNumber: true } },
        _count: { select: { comments: true } },
        comments: {
          where: { isBestAnswer: true, status: 'published' },
          take: 1,
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return okResponse({
      posts: posts.map(p => ({
        id: p.id,
        authorName: p.author.name,
        authorDept: p.author.departmentCode ?? '—',
        authorSemester: p.author.semesterNumber ?? 0,
        section: p.section,
        title: p.title,
        body: p.body,
        postType: p.postType,
        status: p.status,
        commentCount: p._count.comments,
        upvotes: 0,
        isAnswered: p.comments.length > 0,
        aiResponse: p.aiFlagReason && p.aiFlagged ? null : null, // AI response would be stored separately
        createdAt: p.createdAt.toISOString(),
      })),
    })
  })
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('BAD_REQUEST', JSON.stringify(parsed.error.flatten()), 400, true)
    }

    const limiter = await checkRateLimit({
      action: 'community_post',
      identifier: user.id,
      limit: 10,
      windowMs: 60 * 60 * 1000, // 10 posts/hour
    })
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMITED', `Too many posts. Try again in ${limiter.retryAfterSec}s.`, 429, true)
    }

    const post = await db.communityPost.create({
      data: {
        authorId: user.id,
        section: parsed.data.section,
        title: parsed.data.title,
        body: parsed.data.body,
        postType: parsed.data.postType,
        subjectId: parsed.data.subjectId,
        status: 'published',
      },
    })

    // AI pre-check (fail-open)
    try {
      if (process.env.GROQ_API_KEY) {
        const { getAiProvider } = await import('@/lib/ai/provider')
        const provider = getAiProvider()
        const aiRes = await provider.chat({
          systemPrompt: 'You are a content moderator. Analyze this student post for spam, harassment, or severe off-topic abuse. Reply with only "SAFE" or "FLAG: <reason>".',
          messages: [{ role: 'user', content: parsed.data.body }],
          maxTokens: 50,
        })
        if (aiRes.content.startsWith('FLAG')) {
          await db.communityPost.update({
            where: { id: post.id },
            data: { aiFlagged: true, aiFlagReason: aiRes.content },
          })
        }
      }
    } catch {
      // Fail open — post still published
    }

    // For discussion questions, generate LEO's take
    if (parsed.data.section === 'discussion' && process.env.GROQ_API_KEY) {
      try {
        const { getAiProvider } = await import('@/lib/ai/provider')
        const provider = getAiProvider()
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { departmentCode: true, semesterNumber: true },
        })
        const aiRes = await provider.chat({
          systemPrompt: `You are LEO, Lernio's AI tutor. A student from ${dbUser?.departmentCode ?? 'DCOMP'} semester ${dbUser?.semesterNumber ?? 3} asked a question. Provide a helpful, concise answer (max 200 words). This is a starting point, not the final word — peers may have better answers.`,
          messages: [{ role: 'user', content: parsed.data.title ? `${parsed.data.title}\n\n${parsed.data.body}` : parsed.data.body }],
          maxTokens: 300,
        })
        await db.communityComment.create({
          data: {
            postId: post.id,
            authorId: user.id, // Posted by the asker on behalf of LEO
            body: `🤖 LEO's Take: ${aiRes.content}`,
            status: 'published',
          },
        })
      } catch {
        // AI answer is best-effort, not critical
      }
    }

    return okResponse({ post })
  })
}
