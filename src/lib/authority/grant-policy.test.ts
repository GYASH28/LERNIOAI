import { describe, expect, it } from 'vitest'
import { validateAuthorityGrantDraft } from './grant-policy'

describe('authority grant policy', () => {
  it('requires class scope for CR grants', () => {
    expect(validateAuthorityGrantDraft({ role: 'cr' })).toMatch(/class group/i)
    expect(validateAuthorityGrantDraft({ role: 'cr', classGroupId: 'class-1' })).toBeNull()
  })

  it('requires subject scope for teacher grants', () => {
    expect(validateAuthorityGrantDraft({ role: 'teacher', classGroupId: 'class-1' })).toMatch(/subject/i)
    expect(validateAuthorityGrantDraft({ role: 'teacher', subjectIds: ['subject-1'] })).toBeNull()
  })

  it('accepts reviewer subject or department scopes', () => {
    expect(validateAuthorityGrantDraft({ role: 'reviewer' })).toMatch(/subject or department/i)
    expect(validateAuthorityGrantDraft({ role: 'reviewer', subjectId: 'subject-1' })).toBeNull()
    expect(validateAuthorityGrantDraft({ role: 'reviewer', departmentCode: 'COMP' })).toBeNull()
  })

  it('does not grant admin through scoped authority workflows', () => {
    expect(validateAuthorityGrantDraft({ role: 'admin', institutionId: 'inst-1' })).toMatch(/cannot be granted/i)
  })
})
