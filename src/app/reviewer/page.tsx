import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { SimpleWorkspaceDashboard } from '@/components/authority/simple-workspace-dashboard'

export const metadata: Metadata = { title: 'Reviewer Dashboard' }

export default async function ReviewerPage() {
  const authority = await requireActiveRole('reviewer', 'admin')
  const overview = await getWorkspaceOverview('reviewer', authority)
  return <SimpleWorkspaceDashboard authority={authority} overview={overview} />
}
