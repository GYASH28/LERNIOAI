import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getCurriculumSubjects } from './curriculum'
import type { StudentAcademicProfile, SubjectSlug } from './types'

export interface AcademicStudyTaskRow {
  id: string
  taskType: string
  subjectSlug: string
  chapterSlug: string | null
  topicSlug: string | null
  targetHref: string
  estimatedMinutes: number
  scheduledDate: Date
  completedAt: Date | null
}

export interface AcademicStudyPlanRow {
  id: string
  title: string
  startDate: Date
  endDate: Date | null
  status: string
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function getActiveStudyPlan(userId: string) {
  try {
    const plans = await db.$queryRaw<AcademicStudyPlanRow[]>`
      SELECT "id", "title", "startDate", "endDate", "status"
      FROM "AcademicStudyPlan"
      WHERE "userId" = ${userId} AND "status" = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `
    const plan = plans[0]
    if (!plan) return { plan: null, tasks: [] as AcademicStudyTaskRow[] }
    const tasks = await db.$queryRaw<AcademicStudyTaskRow[]>`
      SELECT "id", "taskType", "subjectSlug", "chapterSlug", "topicSlug", "targetHref", "estimatedMinutes", "scheduledDate", "completedAt"
      FROM "AcademicStudyTask"
      WHERE "planId" = ${plan.id}
      ORDER BY "scheduledDate" ASC, "createdAt" ASC
    `
    return { plan, tasks }
  } catch {
    return { plan: null, tasks: [] as AcademicStudyTaskRow[] }
  }
}

export async function generateStarterStudyPlan(userId: string, profile: StudentAcademicProfile, intensity: 'LIGHT' | 'BALANCED' | 'INTENSIVE' = 'BALANCED') {
  const multipliers = { LIGHT: 0.7, BALANCED: 1, INTENSIVE: 1.25 }
  const dailyMinutes = Math.max(30, Math.round(profile.dailyStudyGoal * multipliers[intensity]))
  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]

  const orderedSubjects: SubjectSlug[] = [
    ...profile.weakSubjects.filter((item) => profile.subjects.includes(item)),
    ...profile.subjects.filter((item) => !profile.weakSubjects.includes(item)),
  ]
  const uniqueSubjects = [...new Set(orderedSubjects)]

  const curriculumBySubject = uniqueSubjects.map((subjectSlug) => ({
    subjectSlug,
    entries: classLevels.flatMap((classLevel) => {
      const subject = getCurriculumSubjects(classLevel, [subjectSlug]).find((item) => item.slug === subjectSlug)
      return subject ? subject.chapters.map((chapter) => ({ classLevel, chapter })) : []
    }),
  })).filter((entry) => entry.entries.length)

  if (!curriculumBySubject.length) return null

  const planId = randomUUID()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  await db.$executeRaw`UPDATE "AcademicStudyPlan" SET "status" = 'ARCHIVED', "updatedAt" = NOW() WHERE "userId" = ${userId} AND "status" = 'ACTIVE'`
  await db.$executeRaw`
    INSERT INTO "AcademicStudyPlan" ("id", "userId", "title", "startDate", "endDate", "status", "createdAt", "updatedAt")
    VALUES (${planId}, ${userId}, ${`7-day ${intensity.toLowerCase()} study plan`}, ${isoDate(start)}::date, ${isoDate(end)}::date, 'ACTIVE', NOW(), NOW())
  `

  const subjectPointers = new Map<string, number>()
  for (let day = 0; day < 7; day += 1) {
    const date = new Date(start)
    date.setDate(date.getDate() + day)
    const slots = Math.min(3, curriculumBySubject.length)
    const minutesPerSlot = Math.max(15, Math.floor(dailyMinutes / slots))

    for (let slot = 0; slot < slots; slot += 1) {
      const subjectEntry = curriculumBySubject[(day + slot) % curriculumBySubject.length]
      const pointer = subjectPointers.get(subjectEntry.subjectSlug) ?? 0
      const entry = subjectEntry.entries[pointer % subjectEntry.entries.length]
      subjectPointers.set(subjectEntry.subjectSlug, pointer + 1)
      const taskType = slot === 0 ? 'LEARN' : slot === 1 ? 'PRACTICE' : 'REVISE'
      const targetHref = taskType === 'LEARN'
        ? `/learn/class/${entry.classLevel}/${subjectEntry.subjectSlug}/${entry.chapter.slug}`
        : taskType === 'PRACTICE'
          ? `/practice/session?class=${entry.classLevel}&subject=${subjectEntry.subjectSlug}&chapter=${entry.chapter.slug}`
          : `/revision`

      await db.$executeRaw`
        INSERT INTO "AcademicStudyTask" (
          "id", "planId", "userId", "taskType", "subjectSlug", "chapterSlug", "targetHref",
          "estimatedMinutes", "scheduledDate", "createdAt", "updatedAt"
        ) VALUES (
          ${randomUUID()}, ${planId}, ${userId}, ${taskType}, ${subjectEntry.subjectSlug}, ${entry.chapter.slug}, ${targetHref},
          ${minutesPerSlot}, ${isoDate(date)}::date, NOW(), NOW()
        )
      `
    }
  }

  return getActiveStudyPlan(userId)
}

export async function setStudyTaskComplete(userId: string, taskId: string, complete: boolean) {
  await db.$executeRaw`
    UPDATE "AcademicStudyTask"
    SET "completedAt" = ${complete ? new Date() : null}, "updatedAt" = NOW()
    WHERE "id" = ${taskId} AND "userId" = ${userId}
  `
}
