import { normalizeRole } from '@/lib/roles'

export const forbiddenUserKeys = [
  'passwordHash',
  'refresh_token',
  'access_token',
  'id_token',
  'sessionToken',
  'tokenHash',
  'assignedBy',
  'assignedAt',
  'assignedSubjects',
] as const

export const publicUserSelect = {
  id: true,
  email: true,
  emailVerified: true,
  name: true,
  role: true,
  status: true,
  avatar: true,
  institutionId: true,
  schemeId: true,
  semesterNumber: true,
  branch: true,
  departmentCode: true,
  departmentName: true,
  division: true,
  rollNumber: true,
  provider: true,
  profileComplete: true,
  isCR: true,
  preferredLang: true,
  examDate: true,
  dailyMins: true,
  xp: true,
  level: true,
  streak: true,
  streakFreezes: true,
  lastFreezeUsedDate: true,
  lastActiveDate: true,
  onboarded: true,
  createdAt: true,
  updatedAt: true,
} as const

export interface PublicUserDTO {
  id: string
  email: string
  emailVerified?: string | Date | null
  name: string
  role: string
  status?: string | null
  avatar?: string | null
  institutionId?: string | null
  schemeId?: string | null
  semesterNumber?: number | null
  branch?: string | null
  departmentCode?: string | null
  departmentName?: string | null
  division?: string | null
  rollNumber?: string | null
  provider?: string | null
  profileComplete?: boolean | null
  isCR?: boolean | null
  preferredLang: string
  examDate?: string | null
  dailyMins: number
  xp: number
  level: number
  streak: number
  streakFreezes?: number
  lastFreezeUsedDate?: string | null
  lastActiveDate?: string | null
  onboarded: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}

export function toPublicUserDTO(user: PublicUserDTO): PublicUserDTO {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? null,
    name: user.name,
    role: normalizeRole(user.role),
    status: user.status ?? 'active',
    avatar: user.avatar ?? null,
    institutionId: user.institutionId ?? null,
    schemeId: user.schemeId ?? null,
    semesterNumber: user.semesterNumber ?? null,
    branch: user.branch ?? null,
    departmentCode: user.departmentCode ?? null,
    departmentName: user.departmentName ?? null,
    division: user.division ?? null,
    rollNumber: user.rollNumber ?? null,
    provider: user.provider ?? null,
    profileComplete: user.profileComplete ?? false,
    isCR: user.isCR ?? false,
    preferredLang: user.preferredLang,
    examDate: user.examDate ?? null,
    dailyMins: user.dailyMins,
    xp: user.xp,
    level: levelFromXpValue(user.xp),
    streak: user.streak,
    streakFreezes: user.streakFreezes ?? 0,
    lastFreezeUsedDate: user.lastFreezeUsedDate ?? null,
    lastActiveDate: user.lastActiveDate ?? null,
    onboarded: user.onboarded,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function levelFromXpValue(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}

export function assertNoForbiddenUserKeys(value: unknown): void {
  const seen = new Set<string>()

  function visit(node: unknown) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    for (const [key, child] of Object.entries(node)) {
      if ((forbiddenUserKeys as readonly string[]).includes(key)) seen.add(key)
      visit(child)
    }
  }

  visit(value)
  if (seen.size > 0) {
    throw new Error(`Forbidden user keys leaked: ${Array.from(seen).sort().join(', ')}`)
  }
}
