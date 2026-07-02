/**
 * Lesson notes generator.
 *
 * Generates structured lesson notes from the manifest data.
 * This is NOT AI-generated — it's deterministic scaffolding that
 * provides useful study material from the curated YouTube resources
 * and subject coverage focus.
 *
 * Phase 16 of the master prompt calls for an AI-powered generation
 * pipeline. This module provides the fallback/template version that
 * works without an AI provider.
 */

export interface LessonNoteSection {
  type: 'overview' | 'key_concepts' | 'study_guide' | 'common_mistakes' | 'exam_tips' | 'glossary'
  title: string
  content: string
}

export interface LessonNotes {
  lessonTitle: string
  subjectName: string
  subjectCode: string
  coverageFocus: string
  sections: LessonNoteSection[]
  videoResources: { title: string; channel: string; url: string; role: string }[]
}

/**
 * Generate structured lesson notes from manifest subject data.
 */
export function generateLessonNotes(
  subjectName: string,
  subjectCode: string,
  coverageFocus: string,
  resources: { title: string; channel: string; url: string; role: string; description: string }[],
): LessonNotes {
  // Parse coverage focus into key concepts
  const concepts = coverageFocus
    .split(/[,.]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3)
    .slice(0, 6)

  const primaryVideo = resources.find((r) => r.role === 'primary_video')

  return {
    lessonTitle: `${subjectName} — Overview & Lectures`,
    subjectName,
    subjectCode,
    coverageFocus,
    videoResources: resources.map((r) => ({
      title: r.title,
      channel: r.channel,
      url: r.url,
      role: r.role,
    })),
    sections: [
      {
        type: 'overview',
        title: 'Overview',
        content: `${subjectName} (${subjectCode}) covers: ${coverageFocus}. This lesson provides curated YouTube lectures and study materials to help you master these topics. Start with the primary lecture, then use alternate lectures for different explanations if needed.`,
      },
      {
        type: 'key_concepts',
        title: 'Key Concepts',
        content: concepts
          .map((concept, i) => `${i + 1}. ${concept.charAt(0).toUpperCase() + concept.slice(1)}`)
          .join('\n'),
      },
      {
        type: 'study_guide',
        title: 'How to Study This Lesson',
        content: `1. Watch the primary lecture playlist from start to finish.\n2. Take notes while watching — write down key terms, formulas, and code snippets.\n3. If a topic is unclear, watch the alternate lecture for a different explanation.\n4. For programming subjects, type out every code example yourself — don't just watch.\n5. Use "Ask LEO" to clarify any doubts with AI-powered help.\n6. Practise with the practice questions linked in the sidebar.`,
      },
      {
        type: 'common_mistakes',
        title: 'Common Mistakes to Avoid',
        content: `• Skipping the fundamentals — make sure you understand basics before moving to advanced topics.\n• Only watching without practising — active recall is essential for retention.\n• Not taking notes — writing helps consolidate learning.\n• Cramming everything at once — space your study sessions for better retention.`,
      },
      {
        type: 'exam_tips',
        title: 'Exam Tips',
        content: `• Focus on topics mentioned in the coverage focus — these align with your CWIT R23 syllabus.\n• Practise numerical problems and code examples.\n• Review the primary lecture playlist before exams.\n• Use the revision flashcards for quick recall.\n• Time yourself while practising — exam questions often have time pressure.`,
      },
      {
        type: 'glossary',
        title: 'Key Terms',
        content: concepts
          .map((concept) => `• ${concept.charAt(0).toUpperCase() + concept.slice(1)}`)
          .join('\n'),
      },
    ],
  }
}
