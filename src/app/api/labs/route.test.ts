import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { requireUserMock, withApiMock, okResponseMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  withApiMock: vi.fn((handler) => handler()),
  okResponseMock: vi.fn((data) => ({ ok: true, data })),
}))

vi.mock('@/lib/auth', () => ({
  requireUser: requireUserMock,
  withApi: withApiMock,
  okResponse: okResponseMock,
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public safeMessage: string,
      public status: number = 500,
      public retryable: boolean = true
    ) {
      super(safeMessage)
    }
  },
}))

const {
  getStudentLearningScopeMock,
  hasResolvedLearningScopeMock,
  subjectIdsForLearningScopeMock,
} = vi.hoisted(() => ({
  getStudentLearningScopeMock: vi.fn(),
  hasResolvedLearningScopeMock: vi.fn(),
  subjectIdsForLearningScopeMock: vi.fn(),
}))

vi.mock('@/features/learning/server/get-student-learning-scope', () => ({
  getStudentLearningScope: getStudentLearningScopeMock,
  hasResolvedLearningScope: hasResolvedLearningScopeMock,
  subjectIdsForLearningScope: subjectIdsForLearningScopeMock,
}))

const dbMock = vi.hoisted(() => ({
  practicalExperiment: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

describe('GET /api/labs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws ApiError if the student learning scope is unavailable', async () => {
    requireUserMock.mockResolvedValue({ id: 'user_1' })
    getStudentLearningScopeMock.mockResolvedValue({ unresolvedReason: 'no_semester' })
    hasResolvedLearningScopeMock.mockReturnValue(false)

    await expect(GET()).rejects.toThrow('Learning scope is not available for labs.')
    expect(requireUserMock).toHaveBeenCalled()
    expect(getStudentLearningScopeMock).toHaveBeenCalledWith('user_1')
  })

  it('returns empty experiments and blocker if no subjects are in learning scope', async () => {
    requireUserMock.mockResolvedValue({ id: 'user_1' })
    const dummyScope = {
      programme: { code: 'DCOMP' },
      semester: { number: 2 },
      subjects: [],
    }
    getStudentLearningScopeMock.mockResolvedValue(dummyScope)
    hasResolvedLearningScopeMock.mockReturnValue(true)
    subjectIdsForLearningScopeMock.mockReturnValue([])

    const result = await GET()

    expect(result).toEqual({
      ok: true,
      data: {
        scope: {
          programmeCode: 'DCOMP',
          semesterNumber: 2,
          subjectCount: 0,
        },
        experiments: [],
        blockers: ['No reviewed practical experiments are published for the current learning scope yet.'],
      },
    })
    expect(dbMock.practicalExperiment.findMany).not.toHaveBeenCalled()
  })

  it('queries, maps, and returns practical experiments for scoped subjects', async () => {
    requireUserMock.mockResolvedValue({ id: 'user_1' })
    const dummyScope = {
      programme: { code: 'DCOMP' },
      semester: { number: 2 },
      subjects: [{ id: 'subject_a' }, { id: 'subject_b' }],
    }
    getStudentLearningScopeMock.mockResolvedValue(dummyScope)
    hasResolvedLearningScopeMock.mockReturnValue(true)
    subjectIdsForLearningScopeMock.mockReturnValue(['subject_a', 'subject_b'])

    dbMock.practicalExperiment.findMany.mockResolvedValue([
      {
        id: 'exp_1',
        title: 'Light Emitting Diode',
        objective: 'Study LED characteristics',
        apparatus: 'LED, Resistor, Multimeter',
        software: null,
        safety: 'Limit current through LED',
        order: 1,
        sourceEvidence: 'Lab manual page 5',
        subject: {
          code: 'R23CP1201',
          name: 'Basic Electronics',
        },
        unit: {
          number: 1,
          title: 'Diodes',
        },
      },
    ])

    const result = await GET()

    expect(dbMock.practicalExperiment.findMany).toHaveBeenCalledWith({
      where: {
        subjectId: { in: ['subject_a', 'subject_b'] },
        status: { in: ['active', 'published', 'verified'] },
      },
      orderBy: [
        { subject: { displayOrder: 'asc' } },
        { unit: { number: 'asc' } },
        { order: 'asc' },
        { title: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        objective: true,
        apparatus: true,
        software: true,
        safety: true,
        order: true,
        sourceEvidence: true,
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        unit: {
          select: {
            number: true,
            title: true,
          },
        },
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        scope: {
          programmeCode: 'DCOMP',
          semesterNumber: 2,
          subjectCount: 2,
        },
        experiments: [
          {
            id: 'exp_1',
            title: 'Light Emitting Diode',
            objective: 'Study LED characteristics',
            apparatus: 'LED, Resistor, Multimeter',
            software: null,
            safety: 'Limit current through LED',
            order: 1,
            sourceEvidence: 'Lab manual page 5',
            subjectCode: 'R23CP1201',
            subjectName: 'Basic Electronics',
            unitNumber: 1,
            unitTitle: 'Diodes',
            subjectHref: '/learn/DCOMP/semester/2/subject/R23CP1201',
            unitHref: '/learn/DCOMP/semester/2/subject/R23CP1201/unit/1',
          },
        ],
        blockers: [],
      },
    })
  })
})
