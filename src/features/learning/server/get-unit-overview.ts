import 'server-only'

import { getSubjectOverview } from './get-subject-overview'

export async function getUnitOverview(
  userId: string,
  input: { programmeCode: string; semesterNumber: number; subjectCode: string; unitNumber: number },
) {
  const subjectOverview = await getSubjectOverview(userId, input)
  if (!subjectOverview) return null
  const unit = subjectOverview.units.find((item) => item.number === input.unitNumber)
  if (!unit) return null

  return {
    programme: subjectOverview.programme,
    semester: subjectOverview.semester,
    subject: subjectOverview.subject,
    unit,
  }
}
