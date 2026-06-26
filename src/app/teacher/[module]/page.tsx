import { requireActiveRole } from '@/lib/auth'
import { getWorkspaceModule } from '@/lib/authority/workspace-modules'
import { WorkspaceModulePage } from '@/components/authority/workspace-module-page'

export default async function TeacherModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('teacher', 'admin')
  const data = await getWorkspaceModule('teacher', module, authority)
  return <WorkspaceModulePage role="teacher" module={data} />
}
