import { describe, expect, it } from 'vitest'
import { isDatabaseUnavailableError } from './api-error-policy'

describe('isDatabaseUnavailableError', () => {
  it('recognizes Prisma startup/connectivity failures', () => {
    expect(isDatabaseUnavailableError({ name: 'PrismaClientInitializationError' })).toBe(true)
    expect(isDatabaseUnavailableError({ code: 'P1001' })).toBe(true)
    expect(isDatabaseUnavailableError({ message: "Can't reach database server at localhost" })).toBe(true)
  })

  it('does not classify generic application errors as database outages', () => {
    expect(isDatabaseUnavailableError(new Error('validation failed'))).toBe(false)
    expect(isDatabaseUnavailableError(null)).toBe(false)
  })
})
