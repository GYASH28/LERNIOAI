import type { AcademicChapter, AcademicSubject, SubjectSlug } from './types'

const chapter = (slug: string, name: string, order: number, examTags: AcademicChapter['examTags'] = ['BOARDS', 'JEE_MAIN', 'JEE_ADVANCED']): AcademicChapter => ({
  id: slug,
  slug,
  name,
  order,
  topics: [],
  examTags,
})

const subjects: AcademicSubject[] = [
  {
    id: 'cbse-11-physics', slug: 'physics', name: 'Physics', shortName: 'Physics', classLevel: '11', board: 'CBSE', streamTags: ['PCM', 'PCB', 'PCMB'],
    chapters: [
      chapter('units-and-measurements', 'Units and Measurements', 1),
      chapter('motion-in-a-straight-line', 'Motion in a Straight Line', 2),
      chapter('motion-in-a-plane', 'Motion in a Plane', 3),
      chapter('laws-of-motion', 'Laws of Motion', 4),
      chapter('work-energy-and-power', 'Work, Energy and Power', 5),
      chapter('system-of-particles-and-rotational-motion', 'System of Particles and Rotational Motion', 6),
      chapter('gravitation', 'Gravitation', 7),
      chapter('mechanical-properties-of-solids', 'Mechanical Properties of Solids', 8),
      chapter('mechanical-properties-of-fluids', 'Mechanical Properties of Fluids', 9),
      chapter('thermal-properties-of-matter', 'Thermal Properties of Matter', 10),
      chapter('thermodynamics', 'Thermodynamics', 11),
      chapter('kinetic-theory', 'Kinetic Theory', 12),
      chapter('oscillations', 'Oscillations', 13),
      chapter('waves', 'Waves', 14),
    ],
  },
  {
    id: 'cbse-11-chemistry', slug: 'chemistry', name: 'Chemistry', shortName: 'Chemistry', classLevel: '11', board: 'CBSE', streamTags: ['PCM', 'PCB', 'PCMB'],
    chapters: [
      chapter('some-basic-concepts-of-chemistry', 'Some Basic Concepts of Chemistry', 1),
      chapter('structure-of-atom', 'Structure of Atom', 2),
      chapter('classification-of-elements-and-periodicity', 'Classification of Elements and Periodicity in Properties', 3),
      chapter('chemical-bonding-and-molecular-structure', 'Chemical Bonding and Molecular Structure', 4),
      chapter('chemical-thermodynamics', 'Chemical Thermodynamics', 5),
      chapter('equilibrium', 'Equilibrium', 6),
      chapter('redox-reactions', 'Redox Reactions', 7),
      chapter('organic-chemistry-basic-principles', 'Organic Chemistry: Some Basic Principles and Techniques', 8),
      chapter('hydrocarbons', 'Hydrocarbons', 9),
    ],
  },
  {
    id: 'cbse-11-mathematics', slug: 'mathematics', name: 'Mathematics', shortName: 'Maths', classLevel: '11', board: 'CBSE', streamTags: ['PCM', 'PCMB'],
    chapters: [
      chapter('sets', 'Sets', 1),
      chapter('relations-and-functions', 'Relations and Functions', 2),
      chapter('trigonometric-functions', 'Trigonometric Functions', 3),
      chapter('complex-numbers-and-quadratic-equations', 'Complex Numbers and Quadratic Equations', 4),
      chapter('linear-inequalities', 'Linear Inequalities', 5),
      chapter('permutations-and-combinations', 'Permutations and Combinations', 6),
      chapter('binomial-theorem', 'Binomial Theorem', 7),
      chapter('sequences-and-series', 'Sequences and Series', 8),
      chapter('straight-lines', 'Straight Lines', 9),
      chapter('conic-sections', 'Conic Sections', 10),
      chapter('introduction-to-three-dimensional-geometry', 'Introduction to Three-dimensional Geometry', 11),
      chapter('limits-and-derivatives', 'Limits and Derivatives', 12),
      chapter('statistics', 'Statistics', 13),
      chapter('probability', 'Probability', 14),
    ],
  },
  {
    id: 'cbse-12-physics', slug: 'physics', name: 'Physics', shortName: 'Physics', classLevel: '12', board: 'CBSE', streamTags: ['PCM', 'PCB', 'PCMB'],
    chapters: [
      chapter('electric-charges-and-fields', 'Electric Charges and Fields', 1),
      chapter('electrostatic-potential-and-capacitance', 'Electrostatic Potential and Capacitance', 2),
      chapter('current-electricity', 'Current Electricity', 3),
      chapter('moving-charges-and-magnetism', 'Moving Charges and Magnetism', 4),
      chapter('magnetism-and-matter', 'Magnetism and Matter', 5),
      chapter('electromagnetic-induction', 'Electromagnetic Induction', 6),
      chapter('alternating-current', 'Alternating Current', 7),
      chapter('electromagnetic-waves', 'Electromagnetic Waves', 8),
      chapter('ray-optics-and-optical-instruments', 'Ray Optics and Optical Instruments', 9),
      chapter('wave-optics', 'Wave Optics', 10),
      chapter('dual-nature-of-radiation-and-matter', 'Dual Nature of Radiation and Matter', 11),
      chapter('atoms', 'Atoms', 12),
      chapter('nuclei', 'Nuclei', 13),
      chapter('semiconductor-electronics', 'Semiconductor Electronics', 14),
    ],
  },
  {
    id: 'cbse-12-chemistry', slug: 'chemistry', name: 'Chemistry', shortName: 'Chemistry', classLevel: '12', board: 'CBSE', streamTags: ['PCM', 'PCB', 'PCMB'],
    chapters: [
      chapter('solutions', 'Solutions', 1),
      chapter('electrochemistry', 'Electrochemistry', 2),
      chapter('chemical-kinetics', 'Chemical Kinetics', 3),
      chapter('d-and-f-block-elements', 'The d- and f-Block Elements', 4),
      chapter('coordination-compounds', 'Coordination Compounds', 5),
      chapter('haloalkanes-and-haloarenes', 'Haloalkanes and Haloarenes', 6),
      chapter('alcohols-phenols-and-ethers', 'Alcohols, Phenols and Ethers', 7),
      chapter('aldehydes-ketones-and-carboxylic-acids', 'Aldehydes, Ketones and Carboxylic Acids', 8),
      chapter('amines', 'Amines', 9),
      chapter('biomolecules', 'Biomolecules', 10),
    ],
  },
  {
    id: 'cbse-12-mathematics', slug: 'mathematics', name: 'Mathematics', shortName: 'Maths', classLevel: '12', board: 'CBSE', streamTags: ['PCM', 'PCMB'],
    chapters: [
      chapter('relations-and-functions-12', 'Relations and Functions', 1),
      chapter('inverse-trigonometric-functions', 'Inverse Trigonometric Functions', 2),
      chapter('matrices', 'Matrices', 3),
      chapter('determinants', 'Determinants', 4),
      chapter('continuity-and-differentiability', 'Continuity and Differentiability', 5),
      chapter('applications-of-derivatives', 'Applications of Derivatives', 6),
      chapter('integrals', 'Integrals', 7),
      chapter('applications-of-integrals', 'Applications of Integrals', 8),
      chapter('differential-equations', 'Differential Equations', 9),
      chapter('vector-algebra', 'Vector Algebra', 10),
      chapter('three-dimensional-geometry', 'Three-dimensional Geometry', 11),
      chapter('linear-programming', 'Linear Programming', 12, ['BOARDS']),
      chapter('probability-12', 'Probability', 13),
    ],
  },
]

export function getCurriculumSubjects(classLevel: '11' | '12', subjectSlugs?: SubjectSlug[]) {
  return subjects.filter((subject) =>
    subject.classLevel === classLevel && (!subjectSlugs || subjectSlugs.includes(subject.slug)),
  )
}

export function getCurriculumSubject(classLevel: '11' | '12', subjectSlug: string) {
  return subjects.find((subject) => subject.classLevel === classLevel && subject.slug === subjectSlug) ?? null
}

export function getCurriculumChapter(classLevel: '11' | '12', subjectSlug: string, chapterSlug: string) {
  const subject = getCurriculumSubject(classLevel, subjectSlug)
  if (!subject) return null
  return subject.chapters.find((item) => item.slug === chapterSlug) ?? null
}

export const curriculumMetadata = {
  board: 'CBSE' as const,
  academicYear: '2026-27',
  sourcePolicy: 'Structured curriculum metadata only; learning explanations must be original and resources must be verified before publishing.',
}
