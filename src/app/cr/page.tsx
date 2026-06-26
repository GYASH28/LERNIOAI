import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Class Representative Hub' }

export default async function CrPage() {
  const authority = await requireActiveRole('cr', 'admin')
  const overview = await getWorkspaceOverview('cr', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
