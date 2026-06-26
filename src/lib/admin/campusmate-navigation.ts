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
    label: 'Operations',
    items: [
      { label: 'Command Center', href: '/admin', description: 'Live institution overview and operational priorities.', icon: 'command' },
      { label: 'Analytics & Coverage', href: '/admin/analytics', description: 'Learning, curriculum, and coverage intelligence.', icon: 'analytics' },
    ],
  },
  {
    label: 'Authority',
    items: [
      { label: 'Users', href: '/admin/users', description: 'People, status, canonical role, and academic responsibility.', icon: 'users' },
      { label: 'Authority Assignments', href: '/admin/authority-assignments', description: 'Active scoped grants and operational responsibility.', icon: 'shield' },
      { label: 'Invitations', href: '/admin/invitations', description: 'Create and review controlled elevated-role invitations.', icon: 'mail' },
      { label: 'Role Requests', href: '/admin/role-requests', description: 'Approve or reject requests with real scope.', icon: 'user-check' },
    ],
  },
  {
    label: 'Academic Hierarchy',
    items: [
      { label: 'Institution', href: '/admin/institution', description: 'Institution identity and top-level structure.', icon: 'building' },
      { label: 'Departments', href: '/admin/departments', description: 'Department catalogue, status, and coverage.', icon: 'network' },
      { label: 'Programmes', href: '/admin/programmes', description: 'Programme structure and department ownership.', icon: 'graduation' },
      { label: 'Schemes & Revisions', href: '/admin/schemes', description: 'Academic schemes, revisions, and effective windows.', icon: 'layers' },
      { label: 'Semesters', href: '/admin/semesters', description: 'Semester definitions and subject distribution.', icon: 'calendar' },
      { label: 'Class Groups', href: '/admin/class-groups', description: 'Classes, divisions, memberships, and academic year.', icon: 'classes' },
    ],
  },
  {
    label: 'Syllabus & Content',
    items: [
      { label: 'Source Registry', href: '/admin/source-registry', description: 'Official source evidence and syllabus provenance.', icon: 'database' },
      { label: 'Import Center', href: '/admin/import-center', description: 'Import jobs, extraction status, and failures.', icon: 'upload' },
      { label: 'Extraction Review', href: '/admin/extraction-review', description: 'Human review of extracted academic structure.', icon: 'scan' },
      { label: 'Curriculum Studio', href: '/admin/curriculum-studio', description: 'Subjects, units, topics, and learning outcomes.', icon: 'book' },
      { label: 'Resource Intelligence', href: '/admin/resource-intelligence', description: 'Mapped resources, visibility, and quality.', icon: 'library' },
      { label: 'Content Operations', href: '/admin/content-operations', description: 'Draft, review, verification, and publishing flow.', icon: 'workflow' },
      { label: 'Assessment Studio', href: '/admin/assessment-studio', description: 'Questions, papers, assignments, and result coverage.', icon: 'clipboard' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Audit Explorer', href: '/admin/audit', description: 'Trace authority, content, and system actions.', icon: 'history' },
      { label: 'Security Center', href: '/admin/security', description: 'Account status, sessions, risk, and access health.', icon: 'lock' },
      { label: 'AI Governance', href: '/admin/ai-governance', description: 'AI usage, grounding, review, and provider policy.', icon: 'sparkles' },
      { label: 'Jobs & Integrations', href: '/admin/jobs-integrations', description: 'Background jobs and connected service health.', icon: 'plug' },
      { label: 'System Settings', href: '/admin/settings', description: 'Institution-wide behaviour and feature configuration.', icon: 'settings' },
    ],
  },
]

export const CAMPUSMATE_ADMIN_ITEMS = CAMPUSMATE_ADMIN_NAV.flatMap((group) => group.items)

export function getAdminNavItem(pathname: string) {
  return CAMPUSMATE_ADMIN_ITEMS.find((item) => item.href === pathname) ?? CAMPUSMATE_ADMIN_ITEMS[0]
}
