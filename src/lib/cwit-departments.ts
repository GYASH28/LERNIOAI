export interface CwitDepartment {
  code: string
  name: string
  shortName: string
  category: 'engineering' | 'foundation'
  established?: number
  headTitle: string
  headName: string
  summary: string
  highlights: string[]
  accentColor: string
  officialUrl: string
  programme?: {
    code: string
    name: string
    intake?: number
    intakeNote?: string
    status?: string
  }
}

export const CWIT_DEPARTMENTS: CwitDepartment[] = [
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    shortName: 'Civil',
    category: 'engineering',
    established: 1957,
    headTitle: 'I/C Head of Department',
    headName: 'Dr. C. N. Thombare',
    summary: 'Runs the Diploma in Civil Engineering with surveying, structures, construction, and environmental engineering foundations.',
    highlights: ['Surveying and levelling', 'Structural mechanics', 'Building construction', 'Concrete technology'],
    accentColor: '#10b981',
    officialUrl: 'https://cwit.mespune.org/department/civil-engineering/',
    programme: {
      code: 'DCIV',
      name: 'Diploma in Civil Engineering',
      intake: 60,
      status: 'Government-Aided Autonomous',
    },
  },
  {
    code: 'COMP',
    name: 'Computer Engineering',
    shortName: 'Computer',
    category: 'engineering',
    established: 1984,
    headTitle: 'I/C Head of Department',
    headName: 'Dr. Ashok S. Chandak',
    summary: 'Covers software development, algorithms, hardware systems, networking, and applied computing.',
    highlights: ['Data structures', 'Object oriented programming', 'Microprocessors', 'Data communication'],
    accentColor: '#06b6d4',
    officialUrl: 'https://cwit.mespune.org/department/computer-engineering/',
    programme: {
      code: 'DCOMP',
      name: 'Diploma in Computer Engineering',
      intake: 120,
      status: 'Autonomous',
    },
  },
  {
    code: 'CIOT',
    name: 'Computer Engineering & IoT',
    shortName: 'Computer & IoT',
    category: 'engineering',
    established: 2022,
    headTitle: 'Head of Department',
    headName: 'Dr. Ashok S. Chandak',
    summary: 'Combines computer engineering with connected devices, sensor systems, microcontrollers, and cloud-connected applications.',
    highlights: ['IoT fundamentals', 'Sensors and actuators', 'Microcontroller interfacing', 'Cloud data systems'],
    accentColor: '#6366f1',
    officialUrl: 'https://cwit.mespune.org/department/department-of-computer-engineering-iot/',
    programme: {
      code: 'DCIOT',
      name: 'Diploma in Computer Engineering & IoT',
      intake: 120,
      status: 'Autonomous',
    },
  },
  {
    code: 'ELEC',
    name: 'Electrical Engineering',
    shortName: 'Electrical',
    category: 'engineering',
    established: 1938,
    headTitle: 'I/C HOD',
    headName: 'Prof. S. G. Nehatrao',
    summary: 'The institute first began with electrical technology and now offers diploma study in machines, power, measurement, and control.',
    highlights: ['Electrical machines', 'Power generation', 'Measurements', 'PLC and control'],
    accentColor: '#f59e0b',
    officialUrl: 'https://cwit.mespune.org/department/electrical-engineering/',
    programme: {
      code: 'DELEC',
      name: 'Diploma in Electrical Engineering',
      intake: 60,
      status: 'Government-Aided Autonomous',
    },
  },
  {
    code: 'ENTC',
    name: 'E&TC Engineering',
    shortName: 'E&TC',
    category: 'engineering',
    established: 1958,
    headTitle: 'I/C HOD',
    headName: 'Dr. (Ms) S. P. Thigale',
    summary: 'Focuses on electronics, communication systems, digital circuits, measurements, and telecommunication infrastructure.',
    highlights: ['Electronic devices', 'Digital techniques', 'Communication principles', 'Measurements'],
    accentColor: '#ec4899',
    officialUrl: 'https://cwit.mespune.org/department/department-of-electronics-telecommunication-engineering/',
    programme: {
      code: 'DENTC',
      name: 'Diploma in Electronics and Telecommunication Engineering',
      intake: 120,
      intakeNote: '60 aided + 60 unaided',
      status: 'Aided and Unaided Autonomous',
    },
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    shortName: 'Mechanical',
    category: 'engineering',
    established: 1958,
    headTitle: 'I/C HOD',
    headName: 'Prof. A. A. Bamane',
    summary: 'Builds mechanical design and manufacturing capability through machines, thermal systems, drawing, workshop, and materials.',
    highlights: ['Strength of materials', 'Thermal engineering', 'Working drawing', 'Workshop practice'],
    accentColor: '#8b5cf6',
    officialUrl: 'https://cwit.mespune.org/department/mechanical-engineering/',
    programme: {
      code: 'DMECH',
      name: 'Diploma in Mechanical Engineering',
      intake: 120,
      intakeNote: '60 aided + 60 unaided',
      status: 'Aided and Unaided Autonomous',
    },
  },
  {
    code: 'SH',
    name: 'Science & Humanities',
    shortName: 'Science & Humanities',
    category: 'foundation',
    headTitle: 'Department Coordinator',
    headName: 'Prof. (Ms) A. S. Patil',
    summary: 'Runs first-year foundation learning across Physics, Chemistry, Mathematics, English, and communication skills.',
    highlights: ['Physics', 'Chemistry', 'Mathematics', 'English and communication'],
    accentColor: '#14b8a6',
    officialUrl: 'https://cwit.mespune.org/department/science-and-humanities/',
    programme: {
      code: 'FYSH',
      name: 'First Year Foundation Courses',
      status: 'Foundation Department',
    },
  },
]
