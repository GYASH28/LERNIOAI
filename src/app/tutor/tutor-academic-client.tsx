'use client'

import { TutorView, type AcademicTutorContext } from '@/components/views/tutor-v3'

export function TutorAcademicClient({ academicContext }: { academicContext: AcademicTutorContext }) {
  return <TutorView academicContext={academicContext} />
}
