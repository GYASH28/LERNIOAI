#!/usr/bin/env node
/**
 * Lernio Materials integrity and content-depth audit.
 *
 * Existence != teaching quality. This script reports depth and provenance
 * honestly without silently promoting generated notes or YouTube playlists.
 * npm run notes:audit
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const notesDir = path.join(root, 'content', 'lesson-notes')
const reviewedDir = path.join(root, 'content', 'resources', 'youtube-reviewed')
const files = fs.readdirSync(notesDir).filter((name) => name.endsWith('.json')).sort()
const problems = []
const subjects = []
const looseTemplatePatterns = [
  /understand .* and explain its significance/i,
  /this topic is important in modern computing/i,
  /students should understand the concept/i,
  /in today.s digital world/i,
]

for (const file of files) {
  let doc
  try {
    doc = JSON.parse(fs.readFileSync(path.join(notesDir, file), 'utf8'))
  } catch (error) {
    problems.push(`${file}: invalid JSON (${error.message})`)
    continue
  }

  if (!doc.subjectCode || !doc.subjectName || !Array.isArray(doc.units)) {
    problems.push(`${file}: missing subject identity or units`)
    continue
  }

  const seenSlugs = new Set()
  let lessons = 0, expanded = 0, introductory = 0, underdeveloped = 0
  let templated = 0, examples = 0, diagrams = 0, questions = 0
  const issues = []

  for (const unit of doc.units) {
    if (!Array.isArray(unit.lessons)) {
      issues.push(`Unit ${unit.number} has no lessons array`)
      continue
    }
    for (const lesson of unit.lessons) {
      lessons++
      if (!lesson.slug || !lesson.title) {
        issues.push(`Unit ${unit.number} has an untitled/unsluggified lesson`)
        continue
      }
      if (seenSlugs.has(lesson.slug)) issues.push(`Duplicate lesson slug: ${lesson.slug}`)
      seenSlugs.add(lesson.slug)
      const theory = String(lesson.theory || '')
      const supporting = [
        ...(lesson.keyConcepts || []),
        ...(lesson.objectives || []),
        ...(lesson.examTips || []),
      ].join(' ')
      const isTemplate = looseTemplatePatterns.some((regex) => regex.test(theory + ' ' + supporting))
      const exCount = (lesson.workedExamples?.length || 0) + (lesson.codeExamples?.length || 0)
      const diagramCount = (lesson.diagrams?.length || 0) + (lesson.flowcharts?.length || 0)
      const questionCount = lesson.practiceQuestions?.length || 0
      const hasLearningScaffold = Array.isArray(lesson.keyConcepts) && lesson.keyConcepts.length >= 3
      examples += exCount
      diagrams += diagramCount
      questions += questionCount
      if (isTemplate) templated++
      if (theory.length >= 2200 && exCount >= 1 && questionCount >= 2 && hasLearningScaffold && !isTemplate) expanded++
      else if (theory.length >= 900 && hasLearningScaffold) introductory++
      else underdeveloped++
    }
  }
  if (issues.length) problems.push(...issues.map((issue) => `${file}: ${issue}`))
  subjects.push({
    code: doc.subjectCode,
    name: doc.subjectName,
    semester: doc.semester,
    lessons,
    expanded,
    introductory,
    underdeveloped,
    templated,
    examples,
    diagrams,
    questions,
  })
}

// These subjects have had their previously generic lessons explicitly rewritten.
// Raise their quality bar as a CI regression gate. Other subjects remain visible
// as editorial backlog rather than being incorrectly labelled complete.
const EDITORIALLY_REWRITTEN_SUBJECTS = new Set([
  'R23CP2405', // User Interface Programming
  'R23CP1402', // Animation Techniques
  'R23CP4402', // Indian Constitution
])

for (const subject of subjects) {
  if (!EDITORIALLY_REWRITTEN_SUBJECTS.has(subject.code)) continue
  if (subject.lessons === 0 || subject.expanded !== subject.lessons || subject.templated > 0) {
    problems.push(
      `Editorial regression in ${subject.name}: ${subject.expanded}/${subject.lessons} expanded; ${subject.templated} template-like`,
    )
  }
}

let reviewedVideos = 0
if (fs.existsSync(reviewedDir)) {
  for (const file of fs.readdirSync(reviewedDir).filter((name) => name.endsWith('.json'))) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(reviewedDir, file), 'utf8'))
      const rows = Array.isArray(parsed) ? parsed : parsed.mappings || []
      reviewedVideos += rows.filter((row) =>
        row.publicationStatus === 'approved' &&
        row.verificationStatus === 'reviewed' &&
        typeof row.youtubeVideoId === 'string' &&
        /^[A-Za-z0-9_-]{11}$/.test(row.youtubeVideoId),
      ).length
    } catch (error) {
      problems.push(`Reviewed video file ${file} could not be parsed: ${error.message}`)
    }
  }
}

const totals = {
  subjects: subjects.length,
  lessons: subjects.reduce((sum, row) => sum + row.lessons, 0),
  expanded: subjects.reduce((sum, row) => sum + row.expanded, 0),
  introductory: subjects.reduce((sum, row) => sum + row.introductory, 0),
  underdeveloped: subjects.reduce((sum, row) => sum + row.underdeveloped, 0),
  templated: subjects.reduce((sum, row) => sum + row.templated, 0),
  approvedDirectVideoRecords: reviewedVideos,
  rewrittenSubjects: subjects.filter((s) => EDITORIALLY_REWRITTEN_SUBJECTS.has(s.code)).length,
}
console.log('\nLernio Notes & Materials Quality Audit')
console.log('=====================================')
console.log(JSON.stringify(totals, null, 2))
console.log('\nSubjects needing content expansion (top 20):')
for (const row of subjects
  .slice()
  .sort((a,b) => b.underdeveloped - a.underdeveloped || b.templated - a.templated)
  .slice(0,20)) {
  console.log(`  ${row.code.padEnd(12)} ${String(row.expanded).padStart(2)}/${String(row.lessons).padStart(2)} expanded, ${String(row.templated).padStart(2)} template-like — ${row.name}`)
}
if (problems.length) {
  console.error('\nStructural issues:')
  for (const item of problems) console.error(' - '+item)
  process.exitCode = 1
} else {
  console.log('\nAll note files parse, and no duplicate slugs or missing unit lesson arrays were detected.')
}
