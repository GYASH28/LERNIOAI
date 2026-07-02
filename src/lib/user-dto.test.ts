import { describe, expect, it } from 'vitest'
import { assertNoForbiddenUserKeys, toPublicUserDTO } from './user-dto'

const baseUser = {
  id: 'user_1',
  email: 'student@example.com',
  emailVerified: null,
  name: 'Student One',
  role: 'student',
  status: 'active',
  avatar: null,
  institutionId: null,
  schemeId: null,
  semesterNumber: null,
  branch: null,
  departmentCode: null,
  departmentName: null,
  division: null,
  rollNumber: null,
  provider: 'password',
  profileComplete: false,
  isCR: false,
  preferredLang: 'en',
  examDate: null,
  dailyMins: 60,
  xp: 400,
  level: 999,
  streak: 2,
  streakFreezes: 0,
  lastFreezeUsedDate: null,
  lastActiveDate: null,
  onboarded: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  passwordHash: 'secret',
  assignedSubjects: '["subject"]',
}

describe('public user DTO', () => {
  it('strips forbidden user fields and derives level from XP', () => {
    const dto = toPublicUserDTO(baseUser)
    expect(dto).not.toHaveProperty('passwordHash')
    expect(dto).not.toHaveProperty('assignedSubjects')
    expect(dto.level).toBe(3)
    expect(() => assertNoForbiddenUserKeys(dto)).not.toThrow()
  })

  it('detects forbidden keys recursively in response payloads', () => {
    expect(() => assertNoForbiddenUserKeys({ data: { user: { passwordHash: 'x' } } })).toThrow(
      /passwordHash/,
    )
  })
})
