/**
 * CIOT Lesson-Note Generator
 * Generates 42 CIOT subject lesson-note JSON files with real educational content.
 *
 * Each subject spec contains:
 *   { code, name, semester, credits, units: [{ title, weightage, lessons: [lessonSpec] }] }
 * Each lessonSpec contains:
 *   { slug, title, difficulty, durationMin?, keyConcepts[], formulas?, theory,
 *     workedExample?, viva?, commonMistakes?, examTips?, callouts?, flashcards?, mnemonics? }
 * All other JSON fields (overview, tables, objectives, prerequisites, analogies, flowcharts,
 * mindMaps, complexity, practiceQuestions, interviewQuestions, examQuestions,
 * revisionSummary, cheatSheet, aiSummaries, recommendedNextLessons) are derived/templated.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
//                            SPEC DATABASE
// ============================================================================

const SUBJECTS = require('./specs');

// ============================================================================
//                            BUILDER HELPERS
// ============================================================================

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(s) {
  return String(s).replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
}

function makePracticeQuestions(subjectName, lessonTitle, keyConcepts) {
  const q1 = `Which of the following best describes "${lessonTitle}" in ${subjectName}?`;
  const opts = keyConcepts.slice(0, 3).map(k => k.split(':')[0] || k);
  // Add a wrong distractor
  const distractors = ['A type of hardware device', 'A network protocol layer', 'A programming language keyword', 'An unrelated concept'];
  while (opts.length < 3) opts.push(distractors[opts.length % distractors.length]);
  const allOpts = [opts[0], distractors[0], distractors[1], distractors[2]];
  return [
    {
      question: q1,
      options: allOpts,
      answer: 0,
      explanation: `${lessonTitle} in ${subjectName} primarily concerns ${opts[0]}.`
    },
    {
      question: `Which concept is central to ${lessonTitle}?`,
      options: [keyConcepts[0] || 'Definition', 'Random memory access', 'GUI rendering only', 'Database normalization'],
      answer: 0,
      explanation: `${keyConcepts[0]} is the foundational concept for this lesson.`
    },
    {
      question: `In an exam, the BEST way to answer a question on ${lessonTitle} is to:`,
      options: ['Start with a clear definition, then explain with example', 'Write only the final answer', 'Use bullet points only', 'Repeat the question verbatim'],
      answer: 0,
      explanation: 'Structured answers with definition, explanation, and example score higher in diploma exams.'
    }
  ];
}

function makeTables(subjectName, lessonTitle, keyConcepts, formulas) {
  const rows = keyConcepts.slice(0, 5).map(k => {
    const parts = String(k).split(':');
    return [parts[0].trim(), (parts[1] || 'Core concept of this lesson').trim()];
  });
  const tbl = {
    title: `${lessonTitle} — Key Aspects`,
    headers: ['Aspect', 'Description'],
    rows: rows.length ? rows : [['Concept', 'Core topic in this lesson']]
  };
  const tables = [tbl];
  if (formulas && formulas.length) {
    tables.push({
      title: `${lessonTitle} — Important Formulas`,
      headers: ['#', 'Formula'],
      rows: formulas.map((f, i) => [String(i + 1), f])
    });
  }
  return tables;
}

function makeObjectives(lessonTitle, keyConcepts) {
  const objs = keyConcepts.slice(0, 5).map(k => {
    const head = String(k).split(':')[0].trim();
    return `Define and explain ${head}`;
  });
  objs.push(`Attempt the practice quiz and viva questions on ${lessonTitle}`);
  return objs;
}

function makePrerequisites(unitTitle, subjectName) {
  return [
    `Familiarity with foundational concepts of ${subjectName}`,
    `Completion of previous unit material (${unitTitle})`,
    'Basic understanding of relevant mathematics and terminology'
  ];
}

function makeAnalogies(lessonTitle) {
  return [{
    scenario: `Learning ${lessonTitle} is like assembling a toolkit`,
    mapping: 'Each concept is a tool — you must know its name, purpose, and when to use it. Mastery comes from deliberate practice, not memorisation.'
  }];
}

function makeFlowchart(lessonTitle) {
  return [{
    type: 'mermaid',
    title: `${lessonTitle} — Process Flow`,
    content: `flowchart TD\n    A[Start: Define Problem] --> B[Gather Inputs]\n    B --> C[Apply Core Concept]\n    C --> D[Compute Solution]\n    D --> E[Verify & Validate]\n    E --> F[End: Final Answer]`
  }];
}

function makeMindMap(lessonTitle, keyConcepts) {
  const branches = keyConcepts.slice(0, 5).map(k => {
    const head = String(k).split(':')[0].trim().replace(/"/g, "'");
    return `    ${head}\n      meaning\n      example\n      application`;
  }).join('\n');
  return [{
    type: 'mermaid',
    title: `${lessonTitle} — Concept Map`,
    content: `mindmap\n  root((${lessonTitle.replace(/"/g, "'")}))\n${branches}`
  }];
}

function makeWorkedExamples(spec, subjectName, lessonTitle) {
  if (spec.workedExample) {
    return [
      {
        title: `Worked Example: ${lessonTitle}`,
        problem: spec.workedExample.problem,
        solution: spec.workedExample.solution,
        explanation: spec.workedExample.explanation
      },
      {
        title: 'Exam-style application',
        problem: `Explain ${lessonTitle} with a real-world example from ${subjectName}.`,
        solution: `Start with definition → state key principles → give one real-world example → end with significance.`,
        explanation: 'Structured answers score higher; always include a concrete example.'
      }
    ];
  }
  return [{
    title: `Worked Example: ${lessonTitle}`,
    problem: `Explain ${lessonTitle} with a diagram.`,
    solution: `Begin with definition; list key principles; provide a labelled diagram; conclude with applications.`,
    explanation: 'A four-step structured answer covers most marking rubrics in diploma exams.'
  }];
}

function makeVivaQuestions(spec, lessonTitle, keyConcepts) {
  const out = [];
  if (spec.viva) {
    out.push({ marks: 2, question: spec.viva.question, modelAnswer: spec.viva.modelAnswer });
  }
  // Add 2 more derived
  out.push({
    marks: 2,
    question: `Define the central concept of ${lessonTitle}.`,
    modelAnswer: keyConcepts[0] ? String(keyConcepts[0]).replace(/^([^:]+):/, '$1 refers to').trim() : `The central concept of ${lessonTitle} is its foundational definition covered in this lesson.`
  });
  out.push({
    marks: 2,
    question: `State one practical application of ${lessonTitle}.`,
    modelAnswer: 'This concept is applied in real-world engineering systems to solve practical problems and improve performance.'
  });
  return out;
}

function makeInterviewQuestions(spec, lessonTitle, keyConcepts) {
  return [
    {
      marks: 3,
      question: `Explain ${lessonTitle} with its key principles and an example.`,
      modelAnswer: keyConcepts.slice(0, 3).map(k => String(k).split(':')[0].trim()).join('; ') + '. Provide a real-world example and state its significance.'
    },
    {
      marks: 5,
      question: `Discuss applications of ${lessonTitle} in industry.`,
      modelAnswer: `Cover the definition, 2-3 key applications, advantages, and limitations of ${lessonTitle}.`
    }
  ];
}

function makeExamQuestions(spec, lessonTitle, keyConcepts) {
  return [
    {
      marks: 5,
      question: `Explain ${lessonTitle} with a diagram.`,
      modelAnswer: `Start with definition; describe key principles; draw a labelled diagram; conclude with applications. Key concepts: ${keyConcepts.slice(0,3).map(k => String(k).split(':')[0].trim()).join(', ')}.`,
      tips: ['Draw a labelled diagram', 'Give at least one real-world example', 'End with a summary line']
    },
    {
      marks: 10,
      question: `Discuss ${lessonTitle} with examples, advantages, and applications.`,
      modelAnswer: `Structure: Definition → Working principle → Real-world example → Advantages → Limitations → Conclusion. Cover ${keyConcepts.slice(0,3).map(k => String(k).split(':')[0].trim()).join(', ')}.`,
      tips: ['Use headings for clarity', 'Provide at least one example', 'State significance and applications']
    }
  ];
}

function makeRevisionSummary(lessonTitle, keyConcepts, formulas) {
  let s = `${lessonTitle} — Quick Revision\n\nKey Concepts:\n`;
  keyConcepts.forEach(k => { s += `- ${k}\n`; });
  if (formulas && formulas.length) {
    s += '\nImportant Formulas:\n';
    formulas.forEach(f => { s += `- ${f}\n`; });
  }
  s += '\nExam Strategy: Define → Explain principle → Provide example → State application. Always draw a diagram where applicable.';
  return s;
}

function makeCheatSheet(keyConcepts, formulas) {
  const sheet = keyConcepts.slice(0, 6).map(k => String(k).split(':')[0].trim());
  if (formulas) formulas.forEach(f => sheet.push(`Formula: ${f}`));
  sheet.push('Always start answers with a clear definition');
  return sheet;
}

function makeOverview(subjectName, unitTitle, lessonTitle) {
  return `${lessonTitle} is an important topic in ${subjectName}, covered under the unit ${unitTitle}. This lesson provides a comprehensive understanding of the fundamental concepts, principles, and practical applications relevant to diploma engineering students pursuing the IoT and Computer Engineering stream.`;
}

function buildLesson(spec, subjectName, unitNumber, unitTitle) {
  const lessonTitle = spec.title;
  const keyConcepts = spec.keyConcepts || [];
  const formulas = spec.formulas || [];
  return {
    slug: spec.slug,
    title: lessonTitle,
    durationMin: spec.durationMin || 20,
    difficulty: spec.difficulty || 'medium',
    overview: makeOverview(subjectName, unitTitle, lessonTitle),
    keyConcepts,
    formulas,
    tables: makeTables(subjectName, lessonTitle, keyConcepts, formulas),
    commonMistakes: spec.commonMistakes || [
      `Not understanding the basic definition of ${lessonTitle}`,
      'Confusing related concepts with each other',
      'Forgetting to state assumptions before solving',
      'Not drawing diagrams where required'
    ],
    examTips: spec.examTips || [
      'Always start with a clear definition',
      'Draw a labelled diagram where applicable',
      'Give at least one real-world example',
      'End with a brief summary of key points'
    ],
    practiceQuestions: makePracticeQuestions(subjectName, lessonTitle, keyConcepts),
    objectives: makeObjectives(lessonTitle, keyConcepts),
    prerequisites: makePrerequisites(unitTitle, subjectName),
    theory: spec.theory,
    analogies: makeAnalogies(lessonTitle),
    flowcharts: makeFlowchart(lessonTitle),
    mindMaps: makeMindMap(lessonTitle, keyConcepts),
    complexity: null,
    workedExamples: makeWorkedExamples(spec, subjectName, lessonTitle),
    vivaQuestions: makeVivaQuestions(spec, lessonTitle, keyConcepts),
    interviewQuestions: makeInterviewQuestions(spec, lessonTitle, keyConcepts),
    examQuestions: makeExamQuestions(spec, lessonTitle, keyConcepts),
    revisionSummary: makeRevisionSummary(lessonTitle, keyConcepts, formulas),
    cheatSheet: makeCheatSheet(keyConcepts, formulas),
    mnemonics: spec.mnemonics || [],
    callouts: spec.callouts || [{ type: 'note', content: `This lesson forms the foundation for advanced topics in ${subjectName}.` }],
    flashcards: spec.flashcards || [],
    aiSummaries: [],
    recommendedNextLessons: []
  };
}

function buildSubject(spec) {
  const units = spec.units.map((u, i) => ({
    number: i + 1,
    title: u.title,
    weightage: u.weightage,
    lessons: u.lessons.map(lspec => buildLesson(lspec, spec.name, i + 1, u.title))
  }));
  // Subject-level revision notes
  let revision = `# ${spec.name} — Quick Revision\n\n**Subject code:** ${spec.code}  \n**Semester:** ${spec.semester}  \n**Credits:** ${spec.credits}  \n\n`;
  units.forEach(u => {
    revision += `## Unit ${u.number}: ${u.title} (${u.weightage}%)\n`;
    u.lessons.forEach(l => {
      revision += `### ${l.title}\n${l.revisionSummary}\n\n`;
    });
  });
  // Subject-level banks: collect a few from lessons
  const interviewBank = [];
  const vivaBank = [];
  const pyqBank = [];
  units.forEach(u => u.lessons.forEach(l => {
    if (l.vivaQuestions[0]) vivaBank.push(l.vivaQuestions[0]);
    if (l.interviewQuestions[0]) interviewBank.push(l.interviewQuestions[0]);
    if (l.examQuestions[0]) pyqBank.push(l.examQuestions[0]);
  }));
  return {
    subjectCode: spec.code,
    subjectName: spec.name,
    semester: spec.semester,
    credits: spec.credits,
    units,
    revisionNotes: revision,
    interviewBank: interviewBank.slice(0, 12),
    vivaBank: vivaBank.slice(0, 12),
    pyqBank: pyqBank.slice(0, 12)
  };
}

// ============================================================================
//                            MAIN
// ============================================================================

function fileStem(spec) {
  const nameSlug = slugify(spec.name).split('-').slice(0, 6).join('-');
  return `${spec.code.toLowerCase()}-${nameSlug}`;
}

function main() {
  const outDir = path.join(__dirname, '..', '..', 'content', 'lesson-notes');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const existing = new Set(fs.readdirSync(outDir).filter(f => f.endsWith('.json')));
  let created = 0, skipped = 0, failed = 0;
  const written = [];
  SUBJECTS.forEach(spec => {
    try {
      const obj = buildSubject(spec);
      const fname = `${fileStem(spec)}.json`;
      const fpath = path.join(outDir, fname);
      // Skip if a file already exists for this code
      const codeLower = spec.code.toLowerCase();
      const alreadyExists = [...existing].some(f => f.toLowerCase().startsWith(codeLower + '-'));
      if (alreadyExists) {
        skipped++;
        return;
      }
      fs.writeFileSync(fpath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
      written.push(fname);
      created++;
    } catch (e) {
      console.error('FAIL', spec.code, e.message);
      failed++;
    }
  });
  console.log(`Created: ${created}, Skipped (already exist): ${skipped}, Failed: ${failed}`);
  console.log('Sample files:');
  written.slice(0, 5).forEach(f => console.log('  -', f));
  console.log(`  ... and ${Math.max(0, written.length - 5)} more`);
}

if (require.main === module) main();
module.exports = { buildSubject, buildLesson };
