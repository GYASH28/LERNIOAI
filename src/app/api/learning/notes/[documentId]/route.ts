import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, requireUser, withApi } from '@/lib/auth'
import { buildSignedObjectUrl } from '@/lib/storage/signed-object-url'
import { studentGeneratedDocumentWhere } from '@/lib/resources/student-publication-policy'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  scopedLessonWhere,
} from '@/features/learning/server/get-student-learning-scope'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ documentId: string }> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { documentId } = await ctx.params
    const format = request.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'html'
    const scope = await getStudentLearningScope(user.id)
    if (!hasResolvedLearningScope(scope)) {
      throw new ApiError('NOT_FOUND', 'Generated note not found.', 404, false)
    }

    const document = await db.generatedLessonDocument.findFirst({
      where: {
        id: documentId,
        ...studentGeneratedDocumentWhere(),
        lesson: scopedLessonWhere(scope),
      },
      select: {
        id: true,
        documentType: true,
        version: true,
        storageObjectKey: true,
        htmlObjectKey: true,
        outputResource: {
          select: {
            url: true,
            title: true,
          },
        },
      },
    })

    if (!document) {
      throw new ApiError('NOT_FOUND', 'Generated note not found.', 404, false)
    }

    const objectKey = format === 'pdf' ? document.storageObjectKey : document.htmlObjectKey
    if (objectKey) {
      const signedUrl = buildSignedObjectUrl({
        objectKey,
        disposition: format === 'pdf' ? 'attachment' : 'inline',
        fileName: lessonNoteFileName(document.documentType, document.version, format),
      })
      if (!signedUrl) {
        throw new ApiError('ARTIFACT_UNAVAILABLE', 'Generated note storage is not configured.', 503, true)
      }

      return Response.redirect(signedUrl, 302)
    }

    if (document.outputResource?.url) {
      return Response.redirect(document.outputResource.url, 302)
    }

    throw new ApiError('ARTIFACT_UNAVAILABLE', 'Generated note artifact is not available.', 404, false)
  })
}

function lessonNoteFileName(documentType: string, version: number, format: 'html' | 'pdf'): string {
  const type = documentType.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
  return `${type}-v${version}.${format}`
}
