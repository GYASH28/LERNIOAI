import { requireActiveRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'

import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function ReviewerModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('reviewer', 'admin')
  const data = await getWorkspaceModule('reviewer', module, authority)
  return <WorkspaceModulePage role="reviewer" module={data} />
}
