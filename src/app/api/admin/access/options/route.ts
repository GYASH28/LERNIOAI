import { db } from '@/lib/db'
import { okResponse, requireActiveRole, withApi } from '@/lib/auth'

export async function GET() {
  return withApi(async () => {
    await requireActiveRole('admin')

    // Fetch from BOTH ClassGroup (old authority) and Class (new lightweight) models
    // so admin components that expect classGroups get our actual class data
    const [institutions, departments, subjects, oldClassGroups, newClasses] = await Promise.all([
      db.institution.findMany({
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        take: 100,
        select: { id: true, code: true, name: true },
      }).catch(() => []),
      db.department.findMany({
        where: { archivedAt: null },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        take: 200,
        select: {
          id: true,
          code: true,
          name: true,
          institutionId: true,
          institution: { select: { code: true } },
        },
      }).catch(() => []),
      db.subject.findMany({
        where: { archivedAt: null },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        take: 300,
        select: {
          id: true,
          code: true,
          name: true,
          schemeId: true,
          semester: { select: { number: true, name: true } },
        },
      }).catch(() => []),
      // Old ClassGroup model (authority system)
      db.classGroup.findMany({
        where: { status: 'active' },
        orderBy: [{ semesterNumber: 'asc' }, { division: 'asc' }, { name: 'asc' }],
        take: 300,
        select: {
          id: true,
          name: true,
          code: true,
          institutionId: true,
          departmentId: true,
          semesterNumber: true,
          division: true,
          department: { select: { code: true, name: true } },
          semester: { select: { number: true, name: true } },
        },
      }).catch(() => []),
      // New Class model (lightweight — our actual class system)
      db.class.findMany({
        orderBy: [{ departmentCode: 'asc' }, { semesterNumber: 'asc' }, { division: 'asc' }],
        select: {
          id: true,
          departmentCode: true,
          semesterNumber: true,
          division: true,
          alias: true,
          cr: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }).catch(() => []),
    ])

    // Merge old ClassGroup + new Class into one classGroups array
    const classGroups = [
      ...oldClassGroups.map((item) => ({
        id: item.id,
        institutionId: item.institutionId,
        departmentId: item.departmentId,
        departmentCode: item.department?.code ?? null,
        label: [
          item.code || item.name,
          item.department?.code,
          item.semesterNumber ? `Sem ${item.semesterNumber}` : item.semester?.name,
          item.division ? `Div ${item.division}` : null,
        ].filter(Boolean).join(' - '),
      })),
      ...newClasses.map((item) => ({
        id: item.id,
        institutionId: null,
        departmentId: null,
        departmentCode: item.departmentCode,
        label: `${item.departmentCode} - Sem ${item.semesterNumber} - Div ${item.division}${item._count?.members ? ` (${item._count.members} students)` : ''}${item.cr ? ` - CR: ${item.cr.name}` : ''}`,
      })),
    ]

    return okResponse({
      institutions: institutions.map((item) => ({
        id: item.id,
        label: `${item.code} - ${item.name}`,
      })),
      departments: departments.map((item) => ({
        id: item.id,
        code: item.code,
        institutionId: item.institutionId,
        label: `${item.code} - ${item.name}${item.institution?.code ? ` (${item.institution.code})` : ''}`,
      })),
      subjects: subjects.map((item) => ({
        id: item.id,
        code: item.code,
        schemeId: item.schemeId,
        label: `${item.code} - ${item.name}${item.semester?.number ? ` - Sem ${item.semester.number}` : ''}`,
      })),
      classGroups,
    })
  })
}
