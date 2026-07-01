/**
 * Enhanced manifest data with unit breakdowns, learning outcomes,
 * and lesson-level detail for each subject.
 *
 * This extends the basic manifest with structured curriculum data
 * per Phase 4 (versioned curriculum manifests) and Phase 11/12/13
 * (semester/subject/lesson page design) of the master prompt.
 */

export interface ManifestLesson {
  slug: string
  title: string
  description: string
  durationMin: number
  difficulty: 'easy' | 'medium' | 'hard'
  outcomes: string[]
}

export interface ManifestUnit {
  number: number
  title: string
  description: string
  weightage: number // exam weightage %
  lessons: ManifestLesson[]
}

export interface EnhancedManifestSubject {
  code: string
  alternateCode: string | null
  name: string
  category: string
  priority: string
  credits: number
  description: string
  coverageFocus: string
  programmeRestriction?: string
  outcomes: string[]
  prerequisites: string[]
  assessmentPattern: string
  resources: ManifestResource[]
  units: ManifestUnit[]
}

export interface ManifestResource {
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

/**
 * Generate standard units for a subject based on its name and coverage focus.
 * This provides a scaffold until official CWIT unit-level syllabus data is imported.
 */
function generateUnits(subjectName: string, coverageFocus: string): ManifestUnit[] {
  // Parse coverage focus into topics
  const topics = coverageFocus.split(/[,.]/).map((t) => t.trim()).filter((t) => t.length > 3).slice(0, 5)

  return topics.map((topic, i) => ({
    number: i + 1,
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    description: `Unit ${i + 1} covers ${topic.toLowerCase()}.`,
    weightage: Math.floor(100 / Math.max(topics.length, 1)),
    lessons: [
      {
        slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60),
        title: `Introduction to ${topic}`,
        description: `Learn the fundamentals of ${topic.toLowerCase()} in the context of ${subjectName}.`,
        durationMin: 15,
        difficulty: 'easy' as const,
        outcomes: [
          `Understand the key concepts of ${topic.toLowerCase()}`,
          `Apply ${topic.toLowerCase()} in practical scenarios`,
          `Solve basic problems related to ${topic.toLowerCase()}`,
        ],
      },
    ],
  }))
}

/**
 * Generate standard course outcomes based on subject category.
 */
function generateOutcomes(subjectName: string, category: string): string[] {
  if (category === 'theory') {
    return [
      `Understand the fundamental concepts of ${subjectName}`,
      `Apply theoretical knowledge to solve problems`,
      `Analyze and evaluate different approaches`,
      `Design solutions using ${subjectName} principles`,
    ]
  }
  if (category === 'practical') {
    return [
      `Perform practical exercises in ${subjectName}`,
      `Use relevant tools and techniques`,
      `Document and present practical work`,
      `Troubleshoot common issues`,
    ]
  }
  return [
    `Understand ${subjectName} concepts`,
    `Apply knowledge in practical scenarios`,
    `Evaluate different approaches`,
  ]
}

/**
 * Generate assessment pattern based on credits.
 */
function generateAssessment(credits: number): string {
  if (credits >= 5) {
    return 'Theory: 60 marks (3hr) + Practical: 25 marks + Term Work: 25 marks = 110 marks total'
  }
  if (credits >= 4) {
    return 'Theory: 60 marks (3hr) + Term Work: 40 marks = 100 marks total'
  }
  return 'Theory: 40 marks + Term Work: 60 marks = 100 marks total'
}

/**
 * Enhance a basic manifest subject with units, outcomes, and assessment.
 */
export function enhanceSubject(
  subject: import('./manifest-data').ManifestSubject,
): EnhancedManifestSubject {
  return {
    ...subject,
    outcomes: generateOutcomes(subject.name, subject.category),
    prerequisites: [],
    assessmentPattern: generateAssessment(subject.credits),
    units: generateUnits(subject.name, subject.coverageFocus),
  }
}
