#!/usr/bin/env tsx
/**
 * Database cleanup script.
 * 1. Deletes ALL users from the database
 * 2. Recreates the admin user with admin role (not student)
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Lernio Database Cleanup ===\n')

  // Step 1: Count existing users
  const userCount = await prisma.user.count()
  console.log(`Found ${userCount} users in the database`)

  // Step 2: Delete ALL users (cascade will handle related records)
  console.log('\nDeleting all users...')
  
  // Delete in order to avoid foreign key constraint errors
  await prisma.codingSubmission.deleteMany({})
  console.log('  ✓ Deleted coding submissions')
  
  await prisma.quizAttempt.deleteMany({})
  console.log('  ✓ Deleted quiz attempts')
  
  await prisma.recentlyViewed.deleteMany({})
  console.log('  ✓ Deleted recently viewed')
  
  await prisma.bookmark.deleteMany({})
  console.log('  ✓ Deleted bookmarks')
  
  await prisma.notification.deleteMany({})
  console.log('  ✓ Deleted notifications')
  
  await prisma.studySession.deleteMany({})
  console.log('  ✓ Deleted study sessions')
  
  await prisma.plannerTask.deleteMany({})
  console.log('  ✓ Deleted planner tasks')
  
  await prisma.feedback.deleteMany({})
  console.log('  ✓ Deleted feedback')
  
  await prisma.achievement.deleteMany({})
  console.log('  ✓ Deleted achievements')
  
  await prisma.xpEvent.deleteMany({})
  console.log('  ✓ Deleted XP events')
  
  await prisma.rateLimitBucket.deleteMany({})
  console.log('  ✓ Deleted rate limit buckets')
  
  // Delete accounts and sessions (next-auth adapter tables)
  await prisma.account.deleteMany({})
  console.log('  ✓ Deleted accounts')
  
  await prisma.session.deleteMany({})
  console.log('  ✓ Deleted sessions')
  
  // Finally delete users
  await prisma.user.deleteMany({})
  console.log('  ✓ Deleted ALL users')

  console.log(`\n✅ Database cleaned — all ${userCount} users removed`)

  // Step 3: Recreate admin user
  const adminEmail = process.env.LERNIO_ADMIN_EMAIL
  const adminPassword = process.env.LERNIO_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.log('\n⚠️  LERNIO_ADMIN_EMAIL or LERNIO_ADMIN_PASSWORD not set')
    console.log('   All users deleted. Admin NOT created — set these env vars and redeploy.')
    return
  }

  if (adminPassword.length < 8) {
    console.log('\n⚠️  Admin password must be at least 8 characters')
    console.log('   All users deleted. Admin NOT created — fix password and redeploy.')
    return
  }

  console.log(`\nCreating admin user: ${adminEmail}`)
  
  const passwordHash = await hash(adminPassword, 12)
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: 'Lernio Admin',
      role: 'admin',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: 'Lernio Admin',
      role: 'admin',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      emailVerified: new Date(),
      preferredLang: 'en',
      dailyMins: 120,
      xp: 0,
      level: 1,
      streak: 0,
      passwordHash,
    },
    select: {
      email: true,
      role: true,
      status: true,
      profileComplete: true,
    },
  })

  console.log(`\n✅ Admin user created successfully:`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role: ${admin.role}`)
  console.log(`   Status: ${admin.status}`)
  console.log(`   Profile complete: ${admin.profileComplete}`)
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
