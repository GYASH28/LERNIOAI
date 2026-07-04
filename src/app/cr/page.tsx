import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { SimpleWorkspaceDashboard } from '@/components/authority/simple-workspace-dashboard'

export const metadata: Metadata = { title: 'CR Dashboard' }

export default async function CrPage() {
  const authority = await requireActiveRole('cr', 'admin')
  const overview = await getWorkspaceOverview('cr', authority)
  return <SimpleWorkspaceDashboard authority={authority} overview={overview} />
}
