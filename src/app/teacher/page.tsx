import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Teacher Studio' }

export default async function TeacherPage() {
  const authority = await requireActiveRole('teacher', 'admin')
  const overview = await getWorkspaceOverview('teacher', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
