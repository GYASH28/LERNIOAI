import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { SimpleWorkspaceDashboard } from '@/components/authority/simple-workspace-dashboard'

export const metadata: Metadata = { title: 'Teacher Dashboard' }

export default async function TeacherPage() {
  const authority = await requireActiveRole('teacher', 'admin')
  const overview = await getWorkspaceOverview('teacher', authority)
  return <SimpleWorkspaceDashboard authority={authority} overview={overview} />
}
