import { redirect } from 'next/navigation'
import { requireActiveRole } from '@/lib/auth'
import { getAdminModuleData } from '@/lib/admin/campusmate-data'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { AdminHierarchyControlPanel, CampusmateModuleView } from '@/components/admin/campusmate-module-view'
import { AdminOperationsControlPanel, CampusmateUsersPanel } from '@/components/admin/campusmate-users-panel'

const HIERARCHY_MODULES = {
  institution: 'institutions',
  departments: 'departments',
  programmes: 'programmes',
  schemes: 'schemes',
  semesters: 'semesters',
  'class-groups': 'classes',
} as const

const OPERATIONS_MODULES = {
  'site-control': 'overview',
  invitations: 'invitations',
  announcements: 'notices',
  'feature-flags': 'flags',
  settings: 'flags',
} as const

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const authority = await requireActiveRole('admin')
  const user = { name: authority.user.name, email: authority.user.email }

  if (module === 'access') redirect('/admin/users')
  if (module === 'users') {
    return <CampusmateAdminShell user={user}><CampusmateUsersPanel /></CampusmateAdminShell>
  }
  if (module in HIERARCHY_MODULES) {
    const section = HIERARCHY_MODULES[module as keyof typeof HIERARCHY_MODULES]
    return <CampusmateAdminShell user={user}><AdminHierarchyControlPanel initialSection={section} /></CampusmateAdminShell>
  }
  if (module in OPERATIONS_MODULES) {
    const section = OPERATIONS_MODULES[module as keyof typeof OPERATIONS_MODULES]
    return <CampusmateAdminShell user={user}><AdminOperationsControlPanel initialSection={section} /></CampusmateAdminShell>
  }

  const data = await getAdminModuleData(module)
  return <CampusmateAdminShell user={user}><CampusmateModuleView data={data} /></CampusmateAdminShell>
}
