import { requireActiveRole, withApi } from '@/lib/auth'
import { loadLessonNotePreview } from '@/lib/lesson-notes/lesson-note-files'
import { renderLessonNoteHtml } from '@/lib/lesson-notes/lesson-note-document'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteSlug: string }> },
) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const { noteSlug } = await params
    const preview = loadLessonNotePreview(noteSlug)
    if (!preview) {
      return new Response('Lesson note preview not found.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return new Response(renderLessonNoteHtml(preview.document), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  })
}
