import { db } from '../src/lib/db'

async function main() {
  console.log('[publish] Starting curriculum publication...')

  // 1. Publish R23 schemes
  const publishedSchemes = await db.academicScheme.updateMany({
    where: {
      code: 'R23',
    },
    data: {
      status: 'published',
    },
  })
  console.log(`[publish] Published ${publishedSchemes.count} academic schemes.`)

  // 2. Activate all subjects under R23 schemes
  const activatedSubjects = await db.subject.updateMany({
    where: {
      scheme: {
        code: 'R23',
      },
    },
    data: {
      status: 'active',
    },
  })
  console.log(`[publish] Activated ${activatedSubjects.count} subjects.`)

  // 3. Migrate users from G Scheme to R23
  const r23Comp = await db.academicScheme.findFirst({
    where: { code: 'R23', programme: { code: 'DCOMP' } },
  })
  const r23Ciot = await db.academicScheme.findFirst({
    where: { code: 'R23', programme: { code: 'DCIOT' } },
  })

  if (r23Comp) {
    const compUsers = await db.user.updateMany({
      where: {
        departmentCode: 'COMP',
      },
      data: {
        schemeId: r23Comp.id,
      },
    })
    console.log(`[publish] Migrated ${compUsers.count} COMP users to R23 COMP scheme.`);
  }

  if (r23Ciot) {
    const ciotUsers = await db.user.updateMany({
      where: {
        departmentCode: 'CIOT',
      },
      data: {
        schemeId: r23Ciot.id,
      },
    })
    console.log(`[publish] Migrated ${ciotUsers.count} CIOT users to R23 CIOT scheme.`);
  }

  console.log('[publish] Curriculum publication complete.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
