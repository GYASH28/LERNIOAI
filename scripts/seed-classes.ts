/**
 * Pre-create all class combinations: 2 departments × 6 semesters × 3 divisions = 36 classes
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-classes.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEPARTMENTS = [
  { code: 'DCOMP', name: 'Diploma in Computer Engineering' },
  { code: 'DCIOT', name: 'Diploma in Computer Engineering & IoT' },
]
const SEMESTERS = [1, 2, 3, 4, 5, 6]
const DIVISIONS = ['A', 'B', 'C']
const ACADEMIC_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

async function main() {
  console.log('Creating classes...')
  let created = 0
  let existing = 0

  for (const dept of DEPARTMENTS) {
    for (const sem of SEMESTERS) {
      for (const div of DIVISIONS) {
        const existingClass = await prisma.class.findUnique({
          where: {
            departmentCode_semesterNumber_division: {
              departmentCode: dept.code,
              semesterNumber: sem,
              division: div,
            },
          },
          select: { id: true },
        })

        if (existingClass) {
          existing++
          continue
        }

        await prisma.class.create({
          data: {
            departmentCode: dept.code,
            semesterNumber: sem,
            division: div,
            academicYear: ACADEMIC_YEAR,
          },
        })
        created++
        console.log(`  ✓ ${dept.code} Sem${sem} Div${div}`)
      }
    }
  }

  console.log(`\n✅ Done! Created ${created} classes, ${existing} already existed.`)
  console.log(`   Total classes in database: ${created + existing}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
