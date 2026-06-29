import { withApi } from '@/lib/auth'
import { loadLessonNotePreview } from '@/lib/lesson-notes/lesson-note-files'
import { renderLessonNoteHtml } from '@/lib/lesson-notes/lesson-note-document'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
} from '@/lib/learning/learning-ops-authority'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteSlug: string }> },
) {
  return withApi(async () => {
    const access = await requireLearningOpsPreviewAccess()
    const { noteSlug } = await params
    const preview = loadLessonNotePreview(noteSlug)
    if (!preview || !matchesLearningOpsReportScope(access.reportScope, {
      programmeCode: preview.document.programmeCode,
      subjectCode: preview.document.subjectCode,
    })) {
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
