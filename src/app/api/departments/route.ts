import { db } from '@/lib/db'
import { withApi, okResponse } from '@/lib/auth'
import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'
import { isDemoMode } from '@/lib/demo-fixtures'

export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(CWIT_DEPARTMENTS)

    const rows = await db.department.findMany({
      include: { programmes: true },
      orderBy: { name: 'asc' },
    })

    if (rows.length === 0) return okResponse(CWIT_DEPARTMENTS)

    const byCode = new Map(rows.map((department) => [department.code, department]))
    return okResponse(
      CWIT_DEPARTMENTS.map((department) => {
        const row = byCode.get(department.code)
        return {
          ...department,
          id: row?.id ?? null,
          programmes: row?.programmes ?? [],
        }
      }),
    )
  })
}
