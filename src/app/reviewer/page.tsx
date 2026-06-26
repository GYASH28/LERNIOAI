import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Review Queue' }

export default async function ReviewerPage() {
  const authority = await requireActiveRole('reviewer', 'admin')
  const overview = await getWorkspaceOverview('reviewer', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
