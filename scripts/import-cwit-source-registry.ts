import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { db } from '../src/lib/db'

interface SourceManifestRow {
  title: string
  sourceType: string
  sourceUrl: string
  revisionLabel: string
  departmentCode: string | null
  notes?: string | null
}

async function main() {
  const manifestPath = new URL('../data/cwit/source-registry.json', import.meta.url)
  const rows = JSON.parse(await readFile(manifestPath, 'utf8')) as SourceManifestRow[]

  const institution = await db.institution.findUnique({
    where: { code: 'CWIT' },
    select: { id: true },
  })

  if (!institution) {
    throw new Error('CWIT institution not found. Run npm run db:departments first.')
  }

  const departments = await db.department.findMany({
    where: { institutionId: institution.id },
    select: { id: true, code: true },
  })
  const departmentByCode = new Map(departments.map((department) => [department.code, department.id]))
  const counters = { created: 0, updated: 0, snapshots: 0, skipped: 0 }

  for (const row of rows) {
    const departmentId = row.departmentCode ? departmentByCode.get(row.departmentCode) ?? null : null
    if (row.departmentCode && !departmentId) {
      counters.skipped += 1
      continue
    }

    const checksum = checksumForRow(institution.id, departmentId, row)
    const existing = await db.syllabusDocument.findFirst({
      where: { institutionId: institution.id, sourceUrl: row.sourceUrl, title: row.title },
      select: { id: true },
    })

    const source = existing
      ? await db.syllabusDocument.update({
          where: { id: existing.id },
          data: {
            departmentId,
            sourceType: row.sourceType,
            revisionLabel: row.revisionLabel,
            checksum,
            trustLevel: 'official',
            status: 'registered',
            notes: row.notes ?? null,
          },
          select: { id: true },
        })
      : await db.syllabusDocument.create({
          data: {
            institutionId: institution.id,
            departmentId,
            title: row.title,
            sourceType: row.sourceType,
            sourceUrl: row.sourceUrl,
            revisionLabel: row.revisionLabel,
            checksum,
            trustLevel: 'official',
            status: 'registered',
            notes: row.notes ?? null,
          },
          select: { id: true },
        })

    if (existing) {
      counters.updated += 1
    } else {
      counters.created += 1
    }

    const snapshot = await db.sourceSnapshot.upsert({
      where: {
        syllabusDocumentId_checksum: {
          syllabusDocumentId: source.id,
          checksum,
        },
      },
      update: {
        sourceUrl: row.sourceUrl,
        fetchStatus: 'registered',
        fetchMetadata: JSON.stringify({ manifest: 'data/cwit/source-registry.json' }),
      },
      create: {
        syllabusDocumentId: source.id,
        sourceUrl: row.sourceUrl,
        checksum,
        fetchStatus: 'registered',
        fetchMetadata: JSON.stringify({ manifest: 'data/cwit/source-registry.json' }),
      },
      select: { id: true },
    })
    if (snapshot.id) counters.snapshots += 1
  }

  console.warn(JSON.stringify(counters, null, 2))
}

function checksumForRow(institutionId: string, departmentId: string | null, row: SourceManifestRow) {
  return createHash('sha256')
    .update(JSON.stringify({ institutionId, departmentId, row }))
    .digest('hex')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
