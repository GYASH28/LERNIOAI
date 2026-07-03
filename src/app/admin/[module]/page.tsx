import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'

import { requireActiveRole } from '@/lib/auth'
import { getAdminModuleData } from '@/lib/admin/campusmate-data'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { CampusmateModuleView } from '@/components/admin/campusmate-module-view'
import { SimpleAcademicSetup } from '@/components/admin/simple-academic-setup'
import { SimplePeopleRoles } from '@/components/admin/simple-people-roles'
import { SimpleSiteOperations } from '@/components/admin/simple-site-operations'

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('admin')
  const user = { name: authority.user.name, email: authority.user.email }

  if (module === 'access') redirect('/admin/users')
  if (module === 'users') return <CampusmateAdminShell user={user}><SimplePeopleRoles /></CampusmateAdminShell>
  if (module === 'departments') return <CampusmateAdminShell user={user}><SimpleAcademicSetup initialSection="departments" /></CampusmateAdminShell>
  if (module === 'programmes') return <CampusmateAdminShell user={user}><SimpleAcademicSetup initialSection="programmes" /></CampusmateAdminShell>
  if (module === 'class-groups') return <CampusmateAdminShell user={user}><SimpleAcademicSetup initialSection="classes" /></CampusmateAdminShell>
  if (module === 'invitations') return <CampusmateAdminShell user={user}><SimpleSiteOperations initialSection="invitations" /></CampusmateAdminShell>
  if (module === 'announcements') return <CampusmateAdminShell user={user}><SimpleSiteOperations initialSection="notices" /></CampusmateAdminShell>

  if (['institution', 'schemes', 'semesters', 'site-control', 'feature-flags', 'settings'].includes(module)) redirect('/admin')

  const data = await getAdminModuleData(module)
  return <CampusmateAdminShell user={user}><CampusmateModuleView data={data} /></CampusmateAdminShell>
}
