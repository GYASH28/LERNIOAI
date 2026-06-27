import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      status: string
      profileComplete: boolean
      authorityVersion: number
      sessionRevoked?: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    status?: string
    profileComplete?: boolean
    authorityVersion?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role
    status?: string
    profileComplete?: boolean
    authorityVersion?: number
    authorityCheckedAt?: number
    authIssuedAt?: number
    sessionRevoked?: boolean
  }
}
