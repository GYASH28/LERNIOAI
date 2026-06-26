import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('admin')
  const data = await getWorkspaceModule('admin', module, authority)
  return <WorkspaceModulePage role="admin" module={data} />
}
