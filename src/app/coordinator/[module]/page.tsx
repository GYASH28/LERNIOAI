import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function CoordinatorModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('coordinator', 'admin')
  const data = await getWorkspaceModule('coordinator', module, authority)
  return <WorkspaceModulePage role="coordinator" module={data} />
}
