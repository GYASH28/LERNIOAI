import { requireActiveRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'

import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function ModeratorModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('moderator', 'admin')
  const data = await getWorkspaceModule('moderator', module, authority)
  return <WorkspaceModulePage role="moderator" module={data} />
}
