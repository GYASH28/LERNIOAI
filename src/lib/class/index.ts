/**
 * Class system helpers — authorization + class resolution.
 */
import { db } from '@/lib/db'

export async function ensureMyClass(dbUser: {
  id?: string
  role?: string
  departmentCode?: string | null
  semesterNumber?: number | null
  division?: string | null
}) {
  const dept = dbUser.departmentCode || 'DCOMP'
  const sem = dbUser.semesterNumber || 3
  const div = dbUser.division || 'A'
  const year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

  const existing = await db.class.findUnique({
    where: {
      departmentCode_semesterNumber_division: {
        departmentCode: dept,
        semesterNumber: sem,
        division: div,
      },
    },
  })
  if (existing) return existing

  try {
    return await db.class.create({
      data: { departmentCode: dept, semesterNumber: sem, division: div, academicYear: year },
    })
  } catch {
    return db.class.findUnique({
      where: {
        departmentCode_semesterNumber_division: {
          departmentCode: dept,
          semesterNumber: sem,
          division: div,
        },
      },
    })
  }
}

export function canModerateClass(
  user: { role: string; departmentCode?: string | null; id?: string },
  classRecord: { departmentCode: string; crId?: string | null },
): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'coordinator' || user.role === 'teacher') {
    return !user.departmentCode || user.departmentCode === classRecord.departmentCode
  }
  if (user.role === 'cr') {
    return Boolean(user.id) && classRecord.crId === user.id
  }
  return false
}
