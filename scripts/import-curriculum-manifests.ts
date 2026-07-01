import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { db } from '../src/lib/db'
import { validateCurriculumManifest } from '../src/lib/curriculum/manifest-validation'
import { lessonTitleSlug } from '../src/features/learning/utils/lesson-slugs'

interface CurriculumManifest {
  institutionCode: string
  departmentCode: string
  programmeCode: string
  officialProgrammeCode: string
  schemeCode: string
  schemeRevision: string
  semesterNumber: number
  verificationStatus: string
  sourceReferences: unknown[]
  subjects: ManifestSubject[]
}

interface ManifestSubject {
  order: number
  officialSubjectCode: string
  name: string
  category: string
  credits?: number | null
  assessment: { totalMarks: number }
  units?: ManifestUnit[]
  outcomes?: ManifestOutcome[]
  practicalExperiments?: unknown[]
  sourceReferences: unknown[]
  verificationStatus: string
  notes?: string
}

interface ManifestUnit {
  order: number
  title: string
  description?: string | null
  weightage?: number | null
  outcomes?: string | string[] | null
  topics?: ManifestTopic[]
  lessons?: ManifestLesson[]
  sourceReferences?: unknown[]
  verificationStatus: string
}

interface ManifestTopic {
  order: number
  title: string
  slug?: string | null
  description?: string | null
  difficulty?: string | null
  examWeightage?: number | null
  outcomes?: string | string[] | null
  lessons?: ManifestLesson[]
  sourceReferences?: unknown[]
  verificationStatus: string
}

interface ManifestLesson {
  order?: number
  title: string
  durationMin?: number | null
  learnContent?: string | null
  simplifyContent?: string | null
  visualiseContent?: string | null
  practiseContent?: string | null
  reviseContent?: string | null
  modeContent?: Partial<Record<'learn' | 'simplify' | 'visualise' | 'practise' | 'revise', string | null>>
  citations?: unknown[] | string | null
  sourceReferences?: unknown[]
  sourceCompleteness?: string | null
  verificationStatus?: string
}

interface ManifestOutcome {
  order?: number
  code: string
  text: string
  bloomLevel?: string | null
  sourceReferences?: unknown[]
  verificationStatus?: string
}

interface Counters {
  manifests: number
  schemesCreated: number
  schemesUpdated: number
  semestersCreated: number
  semestersUpdated: number
  subjectsCreated: number
  subjectsUpdated: number
  outcomesCreated: number
  outcomesUpdated: number
  unitsCreated: number
  unitsUpdated: number
  topicsCreated: number
  topicsUpdated: number
  lessonsCreated: number
  lessonsUpdated: number
}

const root = process.cwd()
const manifestsRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const writeMode = process.argv.includes('--write')
const counters: Counters = {
  manifests: 0,
  schemesCreated: 0,
  schemesUpdated: 0,
  semestersCreated: 0,
  semestersUpdated: 0,
  subjectsCreated: 0,
  subjectsUpdated: 0,
  outcomesCreated: 0,
  outcomesUpdated: 0,
  unitsCreated: 0,
  unitsUpdated: 0,
  topicsCreated: 0,
  topicsUpdated: 0,
  lessonsCreated: 0,
  lessonsUpdated: 0,
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

async function main() {
  const files = findManifestFiles(manifestsRoot)
  if (files.length === 0) throw new Error('No curriculum manifests found.')

  for (const file of files) {
    const label = relative(root, file).replaceAll('\\', '/')
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as CurriculumManifest
    const validation = validateCurriculumManifest(parsed, label)
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'))
    }
    await importManifest(parsed, label)
  }

  console.warn(JSON.stringify({ mode: writeMode ? 'write' : 'dry-run', ...counters }, null, 2))
}

async function importManifest(manifest: CurriculumManifest, label: string) {
  counters.manifests += 1
  const institution = await db.institution.findUnique({
    where: { code: manifest.institutionCode },
    select: { id: true },
  })
  if (!institution) throw new Error(`${label}: Institution ${manifest.institutionCode} not found. Run npm run db:departments first.`)

  const department = await db.department.findFirst({
    where: { institutionId: institution.id, code: manifest.departmentCode, archivedAt: null },
    select: { id: true },
  })
  if (!department) throw new Error(`${label}: Active department ${manifest.departmentCode} not found.`)

  const programme = await db.programme.findFirst({
    where: { departmentId: department.id, code: manifest.programmeCode, archivedAt: null },
    select: { id: true },
  })
  if (!programme) throw new Error(`${label}: Active programme ${manifest.programmeCode} not found.`)

  const existingScheme = await db.academicScheme.findFirst({
    where: {
      institutionId: institution.id,
      programmeId: programme.id,
      code: manifest.schemeCode,
      revisionLabel: manifest.schemeRevision,
      archivedAt: null,
    },
    select: { id: true },
  })

  const scheme = writeMode
    ? existingScheme
      ? await db.academicScheme.update({
          where: { id: existingScheme.id },
          data: {
            name: `${manifest.programmeCode} ${manifest.schemeRevision}`,
            status: 'draft',
            sourceCoverage: JSON.stringify(sourceCoverageForManifest(manifest, label)),
          },
          select: { id: true },
        })
      : await db.academicScheme.create({
          data: {
            institutionId: institution.id,
            programmeId: programme.id,
            code: manifest.schemeCode,
            name: `${manifest.programmeCode} ${manifest.schemeRevision}`,
            startYear: 2023,
            revisionLabel: manifest.schemeRevision,
            status: 'draft',
            sourceCoverage: JSON.stringify(sourceCoverageForManifest(manifest, label)),
          },
          select: { id: true },
        })
    : existingScheme

  if (existingScheme) counters.schemesUpdated += 1
  else counters.schemesCreated += 1

  if (!scheme) return

  const existingSemester = await db.semester.findUnique({
    where: { schemeId_number: { schemeId: scheme.id, number: manifest.semesterNumber } },
    select: { id: true },
  })
  const semester = writeMode
    ? await db.semester.upsert({
        where: { schemeId_number: { schemeId: scheme.id, number: manifest.semesterNumber } },
        update: { name: `Semester ${manifest.semesterNumber}` },
        create: {
          schemeId: scheme.id,
          number: manifest.semesterNumber,
          name: `Semester ${manifest.semesterNumber}`,
        },
        select: { id: true },
      })
    : existingSemester

  if (existingSemester) counters.semestersUpdated += 1
  else counters.semestersCreated += 1

  if (!semester) return

  for (const subject of manifest.subjects) {
    const existingSubject = await db.subject.findUnique({
      where: { schemeId_code: { schemeId: scheme.id, code: subject.officialSubjectCode } },
      select: { id: true },
    })
    let subjectRow = existingSubject
    if (writeMode) {
      subjectRow = await db.subject.upsert({
        where: { schemeId_code: { schemeId: scheme.id, code: subject.officialSubjectCode } },
        update: subjectData(subject, manifest, label, scheme.id, semester.id),
        create: subjectData(subject, manifest, label, scheme.id, semester.id),
        select: { id: true },
      })
    }
    if (existingSubject) counters.subjectsUpdated += 1
    else counters.subjectsCreated += 1

    if (subjectRow && writeMode) {
      await importOutcomes(subjectRow.id, subject)
      await importUnits(subjectRow.id, subject, label)
    } else {
      for (const outcome of subject.outcomes ?? []) {
        const existingOutcome = subjectRow
          ? await db.courseOutcome.findUnique({
              where: { subjectId_code: { subjectId: subjectRow.id, code: outcome.code } },
              select: { id: true },
            })
          : null
        if (existingOutcome) counters.outcomesUpdated += 1
        else counters.outcomesCreated += 1
      }
      await countUnits(subjectRow?.id ?? null, subject)
    }
  }
}

async function importOutcomes(subjectId: string, subject: ManifestSubject) {
  for (const outcome of subject.outcomes ?? []) {
    const existingOutcome = await db.courseOutcome.findUnique({
      where: { subjectId_code: { subjectId, code: outcome.code } },
      select: { id: true },
    })
    await db.courseOutcome.upsert({
      where: { subjectId_code: { subjectId, code: outcome.code } },
      update: outcomeData(subjectId, outcome),
      create: outcomeData(subjectId, outcome),
    })
    if (existingOutcome) counters.outcomesUpdated += 1
    else counters.outcomesCreated += 1
  }
}

async function importUnits(subjectId: string, subject: ManifestSubject, label: string) {
  for (const unit of subject.units ?? []) {
    const existingUnit = await db.unit.findUnique({
      where: { subjectId_number: { subjectId, number: unit.order } },
      select: { id: true },
    })
    const unitRow = await db.unit.upsert({
      where: { subjectId_number: { subjectId, number: unit.order } },
      update: unitData(subjectId, unit, subject, label),
      create: unitData(subjectId, unit, subject, label),
      select: { id: true },
    })
    if (existingUnit) counters.unitsUpdated += 1
    else counters.unitsCreated += 1

    await importTopics(unitRow.id, unit, subject, label)
    await importLessons({ subject, label, unit, unitId: unitRow.id, topic: null, topicId: null })
  }
}

async function importTopics(unitId: string, unit: ManifestUnit, subject: ManifestSubject, label: string) {
  for (const topic of unit.topics ?? []) {
    const slug = topicSlug(topic)
    const existingTopic = await db.topic.findUnique({
      where: { unitId_slug: { unitId, slug } },
      select: { id: true },
    })
    const topicRow = await db.topic.upsert({
      where: { unitId_slug: { unitId, slug } },
      update: topicData(unitId, topic, unit, subject, label),
      create: topicData(unitId, topic, unit, subject, label),
      select: { id: true },
    })
    if (existingTopic) counters.topicsUpdated += 1
    else counters.topicsCreated += 1

    await importLessons({ subject, label, unit, unitId, topic, topicId: topicRow.id })
  }
}

async function importLessons(input: {
  subject: ManifestSubject
  label: string
  unit: ManifestUnit
  unitId: string
  topic: ManifestTopic | null
  topicId: string | null
}) {
  for (const [index, lesson] of (input.topic?.lessons ?? input.unit.lessons ?? []).entries()) {
    const order = lesson.order ?? index + 1
    const existingLesson = await db.lesson.findFirst({
      where: input.topicId
        ? { topicId: input.topicId, order, title: lesson.title }
        : { unitId: input.unitId, topicId: null, order, title: lesson.title },
      select: { id: true },
    })

    if (existingLesson) {
      await db.lesson.update({
        where: { id: existingLesson.id },
        data: lessonData(input, lesson, order),
      })
      counters.lessonsUpdated += 1
    } else {
      await db.lesson.create({
        data: lessonData(input, lesson, order),
      })
      counters.lessonsCreated += 1
    }
  }
}

async function countUnits(subjectId: string | null, subject: ManifestSubject) {
  for (const unit of subject.units ?? []) {
    const existingUnit = subjectId
      ? await db.unit.findUnique({
          where: { subjectId_number: { subjectId, number: unit.order } },
          select: { id: true },
        })
      : null
    if (existingUnit) counters.unitsUpdated += 1
    else counters.unitsCreated += 1

    await countTopics(existingUnit?.id ?? null, unit)
    await countLessons({ unitId: existingUnit?.id ?? null, topicId: null, lessons: unit.lessons ?? [] })
  }
}

async function countTopics(unitId: string | null, unit: ManifestUnit) {
  for (const topic of unit.topics ?? []) {
    const slug = topicSlug(topic)
    const existingTopic = unitId
      ? await db.topic.findUnique({
          where: { unitId_slug: { unitId, slug } },
          select: { id: true },
        })
      : null
    if (existingTopic) counters.topicsUpdated += 1
    else counters.topicsCreated += 1

    await countLessons({ unitId, topicId: existingTopic?.id ?? null, lessons: topic.lessons ?? [] })
  }
}

async function countLessons(input: {
  unitId: string | null
  topicId: string | null
  lessons: ManifestLesson[]
}) {
  for (const [index, lesson] of input.lessons.entries()) {
    const order = lesson.order ?? index + 1
    const existingLesson = input.unitId
      ? await db.lesson.findFirst({
          where: input.topicId
            ? { topicId: input.topicId, order, title: lesson.title }
            : { unitId: input.unitId, topicId: null, order, title: lesson.title },
          select: { id: true },
        })
      : null
    if (existingLesson) counters.lessonsUpdated += 1
    else counters.lessonsCreated += 1
  }
}

function subjectData(
  subject: ManifestSubject,
  manifest: CurriculumManifest,
  label: string,
  schemeId: string,
  semesterId: string,
) {
  return {
    schemeId,
    semesterId,
    code: subject.officialSubjectCode,
    name: subject.name,
    shortName: subject.name,
    displayOrder: subject.order,
    credits: Math.round(subject.credits ?? 0) || 1,
    category: subject.category,
    assessmentMetadata: JSON.stringify(subject.assessment),
    sourceEvidence: JSON.stringify({
      manifest: label,
      programmeCode: manifest.programmeCode,
      officialProgrammeCode: manifest.officialProgrammeCode,
      schemeCode: manifest.schemeCode,
      schemeRevision: manifest.schemeRevision,
      semesterNumber: manifest.semesterNumber,
      subjectSourceReferences: subject.sourceReferences,
      manifestSourceReferences: manifest.sourceReferences,
      verificationStatus: subject.verificationStatus,
      notes: subject.notes ?? null,
    }),
    status: 'draft',
    reviewStatus: subject.verificationStatus,
  }
}

function outcomeData(subjectId: string, outcome: ManifestOutcome) {
  return {
    subjectId,
    code: outcome.code,
    text: outcome.text,
    order: outcome.order ?? (Number(outcome.code.replace(/\D/g, '')) || 0),
    bloomLevel: outcome.bloomLevel ?? null,
    sourceEvidence: JSON.stringify({
      sourceReferences: outcome.sourceReferences ?? [],
      verificationStatus: outcome.verificationStatus ?? 'draft',
    }),
    status: outcome.verificationStatus ?? 'draft',
  }
}

function unitData(subjectId: string, unit: ManifestUnit, subject: ManifestSubject, label: string) {
  const verificationStatus = unit.verificationStatus ?? 'draft'
  return {
    subjectId,
    number: unit.order,
    title: unit.title,
    description: unit.description ?? null,
    weightage: Math.round(unit.weightage ?? 0),
    outcomes: normalizeText(unit.outcomes),
    sourceEvidence: JSON.stringify({
      manifest: label,
      officialSubjectCode: subject.officialSubjectCode,
      unitSourceReferences: unit.sourceReferences ?? [],
      verificationStatus,
    }),
    status: structuralStatus(verificationStatus),
    reviewStatus: verificationStatus,
    publishedAt: publishedAtFor(verificationStatus),
  }
}

function topicData(
  unitId: string,
  topic: ManifestTopic,
  unit: ManifestUnit,
  subject: ManifestSubject,
  label: string,
) {
  const verificationStatus = topic.verificationStatus ?? 'draft'
  return {
    unitId,
    slug: topicSlug(topic),
    title: topic.title,
    description: topic.description ?? null,
    difficulty: topic.difficulty ?? 'medium',
    examWeightage: Math.round(topic.examWeightage ?? 0),
    outcomes: normalizeText(topic.outcomes),
    sourceEvidence: JSON.stringify({
      manifest: label,
      officialSubjectCode: subject.officialSubjectCode,
      unitOrder: unit.order,
      topicSourceReferences: topic.sourceReferences ?? [],
      verificationStatus,
    }),
    status: structuralStatus(verificationStatus),
    reviewStatus: verificationStatus,
    publishedAt: publishedAtFor(verificationStatus),
  }
}

function lessonData(
  input: {
    subject: ManifestSubject
    label: string
    unit: ManifestUnit
    unitId: string
    topic: ManifestTopic | null
    topicId: string | null
  },
  lesson: ManifestLesson,
  order: number,
) {
  const verificationStatus = lesson.verificationStatus ?? 'draft'
  return {
    title: lesson.title,
    order,
    durationMin: Math.max(1, Math.round(lesson.durationMin ?? 10)),
    unitId: input.topicId ? null : input.unitId,
    topicId: input.topicId,
    learnContent: lesson.learnContent ?? lesson.modeContent?.learn ?? null,
    simplifyContent: lesson.simplifyContent ?? lesson.modeContent?.simplify ?? null,
    visualiseContent: lesson.visualiseContent ?? lesson.modeContent?.visualise ?? null,
    practiseContent: lesson.practiseContent ?? lesson.modeContent?.practise ?? null,
    reviseContent: lesson.reviseContent ?? lesson.modeContent?.revise ?? null,
    citations: normalizeCitations(lesson.citations ?? lesson.sourceReferences ?? []),
    status: lessonStatus(verificationStatus),
    publishedAt: verificationStatus === 'published' ? new Date() : null,
    aiGenerated: false,
    sourceCompleteness: lesson.sourceCompleteness ?? verificationStatus,
    sourceEvidence: undefined,
  }
}

function topicSlug(topic: ManifestTopic): string {
  return lessonTitleSlug(topic.slug || topic.title)
}

function structuralStatus(verificationStatus: string): string {
  return ['structure_verified', 'content_verified', 'published'].includes(verificationStatus)
    ? 'active'
    : 'draft'
}

function lessonStatus(verificationStatus: string): string {
  if (verificationStatus === 'published') return 'published'
  if (['structure_verified', 'content_verified'].includes(verificationStatus)) return 'verified'
  return 'draft'
}

function publishedAtFor(verificationStatus: string): Date | null {
  return ['structure_verified', 'content_verified', 'published'].includes(verificationStatus)
    ? new Date()
    : null
}

function normalizeText(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value.join('\n')
  return value ?? null
}

function normalizeCitations(value: unknown[] | string | null): string | null {
  if (typeof value === 'string') return value
  if (!value || value.length === 0) return null
  return JSON.stringify(value)
}

function sourceCoverageForManifest(manifest: CurriculumManifest, label: string) {
  return {
    manifest: label,
    verificationStatus: manifest.verificationStatus,
    sourceReferences: manifest.sourceReferences,
    subjectCount: manifest.subjects.length,
  }
}

function findManifestFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      out.push(...findManifestFiles(fullPath))
    } else if (/semester-\d+\.json$/.test(entry)) {
      out.push(fullPath)
    }
  }
  return out.sort()
}
