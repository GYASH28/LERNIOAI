import { db } from '@/lib/db'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  subjectIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

const STUDENT_VISIBLE_PRACTICAL_STATUSES = ['active', 'published', 'verified'] as const

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const scope = await getStudentLearningScope(user.id)
    if (!hasResolvedLearningScope(scope)) {
      throw new ApiError('SCOPE_UNAVAILABLE', 'Learning scope is not available for labs.', 400, false)
    }

    const subjectIds = subjectIdsForLearningScope(scope)
    const experiments = subjectIds.length
      ? await db.practicalExperiment.findMany({
          where: {
            subjectId: { in: subjectIds },
            status: { in: [...STUDENT_VISIBLE_PRACTICAL_STATUSES] },
          },
          orderBy: [
            { subject: { displayOrder: 'asc' } },
            { unit: { number: 'asc' } },
            { order: 'asc' },
            { title: 'asc' },
          ],
          select: {
            id: true,
            title: true,
            objective: true,
            apparatus: true,
            software: true,
            safety: true,
            order: true,
            sourceEvidence: true,
            subject: {
              select: {
                code: true,
                name: true,
              },
            },
            unit: {
              select: {
                number: true,
                title: true,
              },
            },
          },
        })
      : []

    return okResponse({
      scope: {
        programmeCode: scope.programme.code,
        semesterNumber: scope.semester.number,
        subjectCount: scope.subjects.length,
      },
      experiments: experiments.map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        objective: experiment.objective,
        apparatus: experiment.apparatus,
        software: experiment.software,
        safety: experiment.safety,
        order: experiment.order,
        sourceEvidence: experiment.sourceEvidence,
        subjectCode: experiment.subject.code,
        subjectName: experiment.subject.name,
        unitNumber: experiment.unit?.number ?? null,
        unitTitle: experiment.unit?.title ?? null,
        subjectHref: `/learn/${scope.programme.code}/semester/${scope.semester.number}/subject/${experiment.subject.code}`,
        unitHref: experiment.unit
          ? `/learn/${scope.programme.code}/semester/${scope.semester.number}/subject/${experiment.subject.code}/unit/${experiment.unit.number}`
          : null,
      })),
      blockers: experiments.length === 0
        ? ['No reviewed practical experiments are published for the current learning scope yet.']
        : [],
    })
  })
}
