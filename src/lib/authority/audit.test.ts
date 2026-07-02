import { describe, expect, it } from 'vitest'
import { redact } from './audit'

describe('authority audit helpers', () => {
  it('redacts sensitive metadata recursively', () => {
    expect(
      redact({
        email: 'admin@lernio.test',
        password: 'secret',
        nested: {
          token: 'raw-token',
          keep: 'visible',
        },
        providers: [{ apiKey: 'provider-key' }],
      }),
    ).toEqual({
      email: 'admin@lernio.test',
      password: '[redacted]',
      nested: {
        token: '[redacted]',
        keep: 'visible',
      },
      providers: [{ apiKey: '[redacted]' }],
    })
  })
})
