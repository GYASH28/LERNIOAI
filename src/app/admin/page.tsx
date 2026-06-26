import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Admin Command Center' }

export default async function AdminPage() {
  const authority = await requireActiveRole('admin')
  const overview = await getWorkspaceOverview('admin', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
