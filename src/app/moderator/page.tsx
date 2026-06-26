import type { Metadata } from 'next'
import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceOverview } from '@/lib/authority/workspace-data'
import { WorkspaceDashboard } from '@/components/authority/workspace-dashboard'

export const metadata: Metadata = { title: 'Moderation Desk' }

export default async function ModeratorPage() {
  const authority = await requireActiveRole('moderator', 'admin')
  const overview = await getWorkspaceOverview('moderator', authority)
  return <WorkspaceDashboard authority={authority} overview={overview} />
}
