import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { SimpleWorkspaceDashboard } from '@/components/authority/simple-workspace-dashboard'

export const metadata: Metadata = { title: 'Coordinator Dashboard' }

export default async function CoordinatorPage() {
  const authority = await requireActiveRole('coordinator', 'admin')
  const overview = await getWorkspaceOverview('coordinator', authority)
  return <SimpleWorkspaceDashboard authority={authority} overview={overview} />
}
