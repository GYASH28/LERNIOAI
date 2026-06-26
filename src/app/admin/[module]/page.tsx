import { redirect } from 'next/navigation'
import { requireActiveRole } from '@/lib/auth'
import { getAdminModuleData } from '@/lib/admin/campusmate-data'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { CampusmateModuleView } from '@/components/admin/campusmate-module-view'
import { AdminAccessConsole } from '@/components/authority/admin-access-console'

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('admin')
  const user = { name: authority.user.name, email: authority.user.email }

  if (module === 'access') redirect('/admin/users')
  if (module === 'users') {
    return (
      <CampusmateAdminShell user={user}>
        <AdminAccessConsole />
      </CampusmateAdminShell>
    )
  }

  const data = await getAdminModuleData(module)
  return (
    <CampusmateAdminShell user={user}>
      <CampusmateModuleView data={data} />
    </CampusmateAdminShell>
  )
}
