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
      update: { name: item.name },
      create: {
        name: item.name,
        code: item.code,
        institutionId: institution.id,
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
        update: { name: item.programme.name },
        create: {
          name: item.programme.name,
          code: item.programme.code,
          departmentId: department.id,
        },
      })
      programmeCount += 1
    }
  }

  console.log(
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
