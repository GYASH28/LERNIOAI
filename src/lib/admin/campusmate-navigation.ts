export type AdminNavItem = {
  label: string
  href: string
  description: string
  icon: string
  badge?: string
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

export const CAMPUSMATE_ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Manage',
    items: [
      { label: 'Dashboard', href: '/admin', description: 'Quick overview and common actions.', icon: 'command' },
      { label: 'People & Roles', href: '/admin/users', description: 'Manage users and assign campus roles.', icon: 'users' },
      { label: 'Academic Setup', href: '/admin/departments', description: 'Add departments, programmes, and classes.', icon: 'building' },
      { label: 'Invite Codes', href: '/admin/invitations', description: 'Create invite codes for other roles.', icon: 'mail' },
      { label: 'Announcements', href: '/admin/announcements', description: 'Send notices to students and staff.', icon: 'clipboard' },
    ],
  },
  {
    label: 'History',
    items: [
      { label: 'Activity Log', href: '/admin/audit', description: 'See important admin changes.', icon: 'history' },
    ],
  },
]

export const CAMPUSMATE_ADMIN_ITEMS = CAMPUSMATE_ADMIN_NAV.flatMap((group) => group.items)

export function getAdminNavItem(pathname: string) {
  return CAMPUSMATE_ADMIN_ITEMS.find((item) => item.href === pathname) ?? CAMPUSMATE_ADMIN_ITEMS[0]
}
