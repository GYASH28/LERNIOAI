import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Coordinator Operations' }

export default async function CoordinatorPage() {
  const authority = await requireActiveRole('coordinator', 'admin')
  const overview = await getWorkspaceOverview('coordinator', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
