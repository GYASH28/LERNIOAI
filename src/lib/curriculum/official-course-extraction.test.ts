import { describe, expect, it } from 'vitest'
import {
  assessUnitCandidateQuality,
  extractOfficialCourseCatalog,
  extractOfficialCourseStructure,
  hasPromotableUnits,
} from './official-course-extraction'

describe('official course extraction', () => {
  it('extracts source pages, outcomes and summary-table unit titles', () => {
    const text = `--- page 10 ---
Course Name Basic Mathematics
Course code R23CP1701
C) COURSE OUTCOMES (COs)
CO1 - Apply the concepts of algebra to solve engineering problems.
CO2: Utilize trigonometry to solve branch specific engineering problems.
D) COURSE CONTENT
Sr.No Unit Unit Title Aligned COs R-Level U-Level A-Level Total Marks
1 I Algebra CO1 3 8 4 15
2 II Trigonometry CO2 3 8 4 15
3 III Straight Lines CO3 3 8 4 15
4 IV Differential Calculus CO4 3 8 4 15
5 V Statistics CO5 3 8 4 15
--- page 11 ---
Course Name Next Course`

    const result = extractOfficialCourseStructure(text, 'R23CP1701')

    expect(result.sourcePages).toEqual([10])
    expect(result.candidateOutcomes).toEqual([
      { code: 'CO1', text: 'Apply the concepts of algebra to solve engineering problems.' },
      { code: 'CO2', text: 'Utilize trigonometry to solve branch specific engineering problems.' },
    ])
    expect(result.candidateUnits.map((unit) => unit.title)).toEqual([
      'Algebra',
      'Trigonometry',
      'Straight Lines',
      'Differential Calculus',
      'Statistics',
    ])
    expect(hasPromotableUnits(result.candidateUnits)).toBe(true)
    expect(result.unitQuality.promotable).toBe(true)
  })

  it('cleans course-content unit titles without retaining learning-outcome fragments', () => {
    const text = `Course Name Programming in C
Course Code R23CP1401
C) COURSE OUTCOMES
CO1 - Develop C program using input-output functions.
D) COURSE CONTENT
1 Unit - I Basics of C Programming LO 1.1 Write algorithm for given problem
2 Unit - II Control structures 2.1 Write a C program using if statement
3 Unit – III Arrays and structure LO 3.1 Write a C Program to process arrays`

    const result = extractOfficialCourseStructure(text, 'R23CP1401')

    expect(result.candidateUnits.map((unit) => unit.title)).toEqual([
      'Basics of C Programming',
      'Control structures',
      'Arrays and structure',
    ])
  })

  it('converts official numbered outcome lists into CO codes', () => {
    const text = `Course Name Data Communication
Course code R23CP2404
B) COURSE OUTCOMES (COs)
The students will able to
1] Select type of signal and data conversion techniques for different applications
2] Identify type of transmission media for given application.
D) COURSE CONTENTS`

    const result = extractOfficialCourseStructure(text, 'R23CP2404')

    expect(result.candidateOutcomes).toEqual([
      { code: 'CO1', text: 'Select type of signal and data conversion techniques for different applications' },
      { code: 'CO2', text: 'Identify type of transmission media for given application.' },
    ])
  })

  it('removes page markers from wrapped numbered outcomes', () => {
    const text = `Course Name Microprocessors
Course code R23CP2403
C) COURSE OUTCOMES (COs)
1. Use instructions in different addressing modes.
2. Understand use of support chips.
114
--- page 115 ---
D) COURSE CONTENT`

    const result = extractOfficialCourseStructure(text, 'R23CP2403')

    expect(result.candidateOutcomes).toEqual([
      { code: 'CO1', text: 'Use instructions in different addressing modes.' },
      { code: 'CO2', text: 'Understand use of support chips.' },
    ])
  })

  it('does not invent a structure when the official course block is missing', () => {
    const result = extractOfficialCourseStructure('Course code R23CP9999', 'R23CP1701')

    expect(result).toMatchObject({
      sourcePages: [],
      candidateOutcomes: [],
      candidateUnits: [],
      unitQuality: { promotable: false },
      extractionStatus: 'course_block_not_found',
    })
  })

  it('extracts official course catalog entries without assigning semesters', () => {
    const text = `--- page 20 ---
Course Name Data Structures
Course code R23CI2602
C) COURSE OUTCOMES
--- page 21 ---
Course Name Object Oriented Programming with C++
Course Code R23CI6604`

    expect(extractOfficialCourseCatalog(text, 'CIOT')).toEqual([
      {
        departmentCode: 'CIOT',
        courseCode: 'R23CI2602',
        courseName: 'Data Structures',
        sourcePages: [20],
      },
      {
        departmentCode: 'CIOT',
        courseCode: 'R23CI6604',
        courseName: 'Object Oriented Programming with C++',
        sourcePages: [21],
      },
    ])
  })

  it('blocks noisy unit title sets before manifest promotion', () => {
    const quality = assessUnitCandidateQuality([
      { order: 1, rawLabel: 'I', title: 'Units and Measurements', source: 'summary_table' },
      { order: 2, rawLabel: 'II', title: 'Electricity, Magnetism and', source: 'summary_table' },
      { order: 4, rawLabel: 'IV', title: 'Introduction to Environmental', source: 'summary_table' },
      { order: 5, rawLabel: 'V', title: 'Waste (e-waste) and', source: 'summary_table' },
    ])

    expect(quality.promotable).toBe(false)
    expect(quality.blockers).toContain('Unit order is not consecutive from 1.')
    expect(quality.blockers).toContain('Unit 2 has an unclean title: Electricity, Magnetism and')
    expect(quality.blockers).toContain('Unit 5 has an unclean title: Waste (e-waste) and')
  })
})
