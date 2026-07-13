/**
 * Fast check: is the database already seeded?
 *
 * Runs a single COUNT query. If the departments table has data,
 * we assume the DB is seeded and skip all seed scripts.
 * This reduces build time from ~5 minutes to ~5 seconds on
 * subsequent deploys.
 */
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.department.count().catch(() => -1)
    if (count < 0) {
      console.log(JSON.stringify({ seeded: false, reason: 'query_failed' }))
      process.exit(0)
    }
    if (count > 0) {
      console.log(JSON.stringify({ seeded: true, departmentCount: count }))
      process.exit(0)
    }
    console.log(JSON.stringify({ seeded: false, departmentCount: 0 }))
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main()
