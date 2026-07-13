/**
 * Delete the test student account and any associated data.
 * Run with: DATABASE_URL="..." npx tsx scripts/delete-test-account.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'teststudent@lernio.ai'
  console.log(`Deleting account: ${email}`)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log('✓ Account not found (already deleted or never existed)')
    return
  }

  // Delete the user — cascading deletes will clean up:
  // - ClassMember entries
  // - AttendanceRecord entries
  // - RecentlyViewed entries
  // - Bookmarks, Notifications, Feedback, etc.
  await prisma.user.delete({ where: { id: user.id } })
  console.log(`✓ Deleted user: ${user.name} (${user.email})`)

  // Also delete any empty classes (classes with no members)
  const emptyClasses = await prisma.class.findMany({
    where: { members: { none: {} } },
    select: { id: true, departmentCode: true, semesterNumber: true, division: true },
  })
  if (emptyClasses.length > 0) {
    await prisma.class.deleteMany({ where: { id: { in: emptyClasses.map(c => c.id) } } })
    console.log(`✓ Deleted ${emptyClasses.length} empty class(es):`)
    emptyClasses.forEach(c => console.log(`  - ${c.departmentCode} Sem${c.semesterNumber} Div${c.division}`))
  } else {
    console.log('✓ No empty classes to clean up')
  }

  console.log('\n✅ Done! You can now sign up fresh.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
