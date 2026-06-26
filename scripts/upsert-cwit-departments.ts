import { db } from '../src/lib/db'
import { CWIT_DEPARTMENTS } from '../src/lib/cwit-departments'

async function main() {
  const institution = await db.institution.upsert({
    where: { code: 'CWIT' },
    update: {
      name: 'Cusrow Wadia Institute of Technology',
      city: 'Pune',
    },
    create: {
      name: 'Cusrow Wadia Institute of Technology',
      code: 'CWIT',
      city: 'Pune',
    },
  })

  let departmentCount = 0
  let programmeCount = 0

  for (const item of CWIT_DEPARTMENTS) {
    const department = await db.department.upsert({
      where: {
        institutionId_code: {
          institutionId: institution.id,
          code: item.code,
        },
      },
      update: {
        name: item.name,
        officialUrl: item.officialUrl,
        category: item.category,
        status: 'active',
        metadata: JSON.stringify({
          shortName: item.shortName,
          established: item.established ?? null,
          headTitle: item.headTitle,
          headName: item.headName,
          summary: item.summary,
          highlights: item.highlights,
          accentColor: item.accentColor,
        }),
        sourceVerifiedAt: new Date(),
      },
      create: {
        name: item.name,
        code: item.code,
        institutionId: institution.id,
        officialUrl: item.officialUrl,
        category: item.category,
        status: 'active',
        metadata: JSON.stringify({
          shortName: item.shortName,
          established: item.established ?? null,
          headTitle: item.headTitle,
          headName: item.headName,
          summary: item.summary,
          highlights: item.highlights,
          accentColor: item.accentColor,
        }),
        sourceVerifiedAt: new Date(),
      },
    })
    departmentCount += 1

    if (item.programme) {
      await db.programme.upsert({
        where: {
          departmentId_code: {
            departmentId: department.id,
            code: item.programme.code,
          },
        },
        update: {
          name: item.programme.name,
          durationSemesters: 6,
          intake: item.programme.intake ?? null,
          intakeNote: item.programme.intakeNote ?? null,
          status: item.programme.status ?? 'active',
        },
        create: {
          name: item.programme.name,
          code: item.programme.code,
          departmentId: department.id,
          durationSemesters: 6,
          intake: item.programme.intake ?? null,
          intakeNote: item.programme.intakeNote ?? null,
          status: item.programme.status ?? 'active',
        },
      })
      programmeCount += 1
    }
  }

  console.warn(
    JSON.stringify({
      institution: institution.name,
      departmentCount,
      programmeCount,
    }),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
