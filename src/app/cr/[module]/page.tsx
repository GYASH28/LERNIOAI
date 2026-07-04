import { requireActiveRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'

import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function CrModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('cr', 'admin')
  const data = await getWorkspaceModule('cr', module, authority)
  return <WorkspaceModulePage role="cr" module={data} />
}
