/**
 * Import CWIT R23 curriculum + YouTube resources into the database.
 *
 * Usage:
 *   npx tsx scripts/import-cwit-curriculum-with-resources.ts --dry-run
 *   npx tsx scripts/import-cwit-curriculum-with-resources.ts --write
 *
 * This script:
 * 1. Reads the curriculum manifests from content/curriculum/cwit-r23/
 * 2. Upserts subjects (with R23 codes) for both DCOMP and DCIOT programmes
 * 3. Creates a default unit + topic + lesson for each subject
 * 4. Creates Resource records for each YouTube playlist/video
 * 5. Links resources to lessons via LessonResource
 *
 * Idempotent: safe to run multiple times. Uses upsert + canonicalUrl dedup.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const WRITE = process.argv.includes('--write')

if (!DRY_RUN && !WRITE) {
  console.error('Usage: import-cwit-curriculum-with-resources.ts [--dry-run|--write]')
  process.exit(1)
}

interface ResourceEntry {
  title: string
  channel: string
  language: string
  role: string
  url: string
  playlistId?: string | null
  videoId?: string | null
  description: string
  sourcePdf: string
  sourcePage: number
}

interface SubjectEntry {
  code: string
  alternateCode: string | null
  name: string
  category: string
  priority: string
  credits: number
  description: string
  coverageFocus: string
  programmeRestriction?: string
  resources: ResourceEntry[]
}

interface SemesterEntry {
  number: number
  name: string
  description: string
  subjects: SubjectEntry[]
}

interface Manifest {
  institutionCode: string
  schemeCode: string
  schemeName: string
  semesters: SemesterEntry[]
}

const MANIFEST_DIR = join(process.cwd(), 'content', 'curriculum', 'cwit-r23')

function loadManifests(): Manifest[] {
  const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = readFileSync(join(MANIFEST_DIR, f), 'utf-8')
    return JSON.parse(raw) as Manifest
  })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function findOrCreateInstitution() {
  const existing = await db.institution.findFirst({ where: { code: 'CWIT' } })
  if (existing) return existing
  return db.institution.create({
    data: {
      code: 'CWIT',
      name: 'Cusrow Wadia Institute of Technology',
      city: 'Pune',
    },
  })
}

async function findOrCreateScheme(institutionId: string) {
  const programmes = await db.programme.findMany({
    where: { code: { in: ['DCOMP', 'DCIOT'] } },
  })
  const schemes: Record<string, string> = {}

  for (const programme of programmes) {
    const existing = await db.academicScheme.findFirst({
      where: { code: 'R23', programmeId: programme.id },
    })
    if (existing) {
      schemes[programme.code] = existing.id
      continue
    }
    const created = await db.academicScheme.create({
      data: {
        code: 'R23',
        name: 'CWIT R23 Diploma Scheme',
        status: 'active',
        startYear: 2023,
        programmeId: programme.id,
        institutionId,
      },
    })
    schemes[programme.code] = created.id
  }
  return schemes
}

async function findOrCreateSemester(schemeId: string, number: number, name: string) {
  const existing = await db.semester.findFirst({
    where: { schemeId, number },
  })
  if (existing) return existing
  return db.semester.create({
    data: { schemeId, number, name },
  })
}

async function findOrCreateSubject(
  semesterId: string,
  schemeId: string,
  programmeCode: string,
  entry: SubjectEntry,
) {
  const code = programmeCode === 'DCIOT' && entry.alternateCode ? entry.alternateCode : entry.code
  const existing = await db.subject.findFirst({
    where: { code, semesterId },
  })
  if (existing) return existing

  return db.subject.create({
    data: {
      code,
      name: entry.name,
      shortName: entry.name.length > 30 ? entry.name.slice(0, 30) : entry.name,
      credits: entry.credits,
      category: entry.category,
      description: entry.description,
      status: 'published',
      reviewStatus: 'approved',
      semesterId,
      schemeId,
    },
  })
}

async function findOrCreateUnit(subjectId: string, number: number, title: string) {
  const existing = await db.unit.findFirst({ where: { subjectId, number } })
  if (existing) return existing
  return db.unit.create({
    data: {
      subjectId,
      number,
      title,
      description: `Unit ${number} of the subject.`,
      status: 'published',
      reviewStatus: 'approved',
    },
  })
}

async function findOrCreateTopic(unitId: string, slug: string, title: string) {
  const existing = await db.topic.findFirst({ where: { unitId, slug } })
  if (existing) return existing
  return db.topic.create({
    data: {
      unitId,
      slug,
      title,
      description: `Topics covered in ${title}.`,
      status: 'published',
      reviewStatus: 'approved',
    },
  })
}

async function findOrCreateLesson(
  topicId: string,
  title: string,
  description: string,
) {
  const existing = await db.lesson.findFirst({ where: { topicId, title } })
  if (existing) return existing
  return db.lesson.create({
    data: {
      topicId,
      title,
      order: 1,
      status: 'published',
      learnContent: JSON.stringify({
        type: 'lesson',
        sections: [
          {
            type: 'overview',
            title: 'Overview',
            content: description,
          },
          {
            type: 'video',
            title: 'Curated Lecture',
            note: 'Watch the primary video playlist for this subject. Use alternate playlists for additional explanations.',
          },
          {
            type: 'notes',
            title: 'Lesson Notes',
            note: 'Detailed notes will be available here once generated and reviewed.',
          },
        ],
      }),
    },
  })
}

async function findOrCreateResource(subjectId: string, entry: ResourceEntry) {
  // Deduplicate by canonicalUrl
  const canonicalUrl = entry.url
  const existing = await db.resource.findFirst({
    where: { canonicalUrl },
  })
  if (existing) return existing

  return db.resource.create({
    data: {
      title: entry.title,
      type: 'video_link',
      url: entry.url,
      canonicalUrl,
      externalId: entry.playlistId ?? entry.videoId ?? null,
      provider: 'youtube',
      subjectId,
      source: 'platform',
      visibility: 'published',
      verified: false,
      language: entry.language,
      creator: entry.channel,
      content: entry.description,
      reviewStatus: 'approved',
      moderationStatus: 'clear',
      linkHealth: 'unknown',
      publishedAt: new Date(),
    },
  })
}

async function findOrCreateLessonResource(
  lessonId: string,
  resourceId: string,
  role: string,
  sortOrder: number,
) {
  const existing = await db.lessonResource.findFirst({
    where: { lessonId, resourceId, role },
  })
  if (existing) return existing
  return db.lessonResource.create({
    data: {
      lessonId,
      resourceId,
      role,
      sortOrder,
      isPrimary: role === 'primary_video',
      isRequired: role === 'primary_video',
      verificationStatus: 'pending',
      status: 'published',
      sourceEvidence: 'CWIT YouTube Lecture Guide PDF',
    },
  })
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN]' : '[WRITE]'} CWIT R23 Curriculum + YouTube Resource Import\n`)

  const manifests = loadManifests()
  console.log(`Loaded ${manifests.length} manifest(s)`)

  const stats = {
    subjects: 0,
    units: 0,
    topics: 0,
    lessons: 0,
    resources: 0,
    lessonResources: 0,
    skipped: 0,
  }

  if (WRITE) {
    const institution = await findOrCreateInstitution()
    console.log(`Institution: ${institution.name}`)

    const schemeIds = await findOrCreateScheme(institution.id)
    console.log(`Schemes: ${JSON.stringify(schemeIds)}`)

    for (const manifest of manifests) {
      for (const semesterEntry of manifest.semesters) {
        for (const programmeCode of ['DCOMP', 'DCIOT']) {
          const schemeId = schemeIds[programmeCode]
          if (!schemeId) {
            console.log(`  Skipping ${programmeCode} — no scheme found`)
            continue
          }

          const semester = await findOrCreateSemester(
            schemeId,
            semesterEntry.number,
            semesterEntry.name,
          )

          for (const subjectEntry of semesterEntry.subjects) {
            // Skip subjects restricted to the other programme
            if (
              subjectEntry.programmeRestriction &&
              subjectEntry.programmeRestriction !== programmeCode
            ) {
              stats.skipped++
              continue
            }

            const subject = await findOrCreateSubject(
              semester.id,
              schemeId,
              programmeCode,
              subjectEntry,
            )
            stats.subjects++

            // Create one unit + topic + lesson per subject (scaffold)
            const unit = await findOrCreateUnit(
              subject.id,
              1,
              `${subjectEntry.name} — Complete Course`,
            )
            stats.units++

            const topicSlug = slugify(subjectEntry.name)
            const topic = await findOrCreateTopic(
              unit.id,
              topicSlug,
              `${subjectEntry.name} — Full Coverage`,
            )
            stats.topics++

            const lesson = await findOrCreateLesson(
              topic.id,
              `${subjectEntry.name} — Overview & Lectures`,
              subjectEntry.coverageFocus,
            )
            stats.lessons++

            // Create resources + link to lesson
            for (let i = 0; i < subjectEntry.resources.length; i++) {
              const resourceEntry = subjectEntry.resources[i]
              const resource = await findOrCreateResource(subject.id, resourceEntry)
              stats.resources++

              await findOrCreateLessonResource(
                lesson.id,
                resource.id,
                resourceEntry.role,
                i,
              )
              stats.lessonResources++
            }

            console.log(
              `  ✓ ${programmeCode} Sem ${semesterEntry.number}: ${subjectEntry.name} (${subjectEntry.resources.length} resources)`,
            )
          }
        }
      }
    }
  } else {
    // Dry run — just count what would be created
    for (const manifest of manifests) {
      for (const semesterEntry of manifest.semesters) {
        for (const programmeCode of ['DCOMP', 'DCIOT']) {
          for (const subjectEntry of semesterEntry.subjects) {
            if (
              subjectEntry.programmeRestriction &&
              subjectEntry.programmeRestriction !== programmeCode
            ) {
              stats.skipped++
              continue
            }
            stats.subjects++
            stats.units++
            stats.topics++
            stats.lessons++
            stats.resources += subjectEntry.resources.length
            stats.lessonResources += subjectEntry.resources.length
          }
        }
      }
    }
  }

  console.log(`\n${DRY_RUN ? 'Would create' : 'Created'}:`)
  console.log(`  Subjects:        ${stats.subjects}`)
  console.log(`  Units:           ${stats.units}`)
  console.log(`  Topics:          ${stats.topics}`)
  console.log(`  Lessons:         ${stats.lessons}`)
  console.log(`  Resources:       ${stats.resources}`)
  console.log(`  LessonResources: ${stats.lessonResources}`)
  console.log(`  Skipped (restrict): ${stats.skipped}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No data was written. Run with --write to apply.')
  } else {
    console.log('\n[WRITE] Import complete.')
  }
}

main()
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
