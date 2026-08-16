import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Credentials are the only enabled provider. The legacy OAuth createUser event
// still exists in the compatibility auth module for old migrations, but must
// never execute in the transformed Class 11/12/JEE runtime.
const handler = NextAuth({ ...authOptions, events: undefined })

export { handler as GET, handler as POST }
