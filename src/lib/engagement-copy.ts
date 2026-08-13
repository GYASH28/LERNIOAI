export interface EngagementLine {
  title: string
  message: string
  joke?: string
}

const ROUTE_LINES: Array<{ match: (pathname: string) => boolean; lines: EngagementLine[] }> = [
  {
    match: (pathname) => pathname.startsWith('/learn'),
    lines: [
      { title: 'Opening your lesson path', message: 'Keeping the next step clear and the distractions outside.', joke: 'One lesson at a time. Even recursion needs a base case.' },
      { title: 'Loading the useful part', message: 'Notes, video, practice and LEO are being connected to the same topic.', joke: 'No random playlists were harmed in this transition.' },
      { title: 'Preparing your study route', message: 'We are highlighting what to do now, not everything you could click.', joke: 'Your syllabus called. It asked for fewer tabs.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/practice'),
    lines: [
      { title: 'Warming up practice mode', message: 'Questions first, explanations immediately after.', joke: 'Wrong answers are just bugs with educational value.' },
      { title: 'Building a smarter question set', message: 'The goal is useful struggle, not random difficulty.', joke: 'Multiple choice: A) focus, B) focus, C) definitely focus.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/revision'),
    lines: [
      { title: 'Refreshing memory', message: 'Due concepts are coming forward before they become forgotten concepts.', joke: 'Your brain has cache too. Revision is the refresh button.' },
      { title: 'Preparing active recall', message: 'Answers stay hidden until you genuinely try.', joke: 'Flashcards: tiny cards, surprisingly large attitude.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/tutor'),
    lines: [
      { title: 'Bringing LEO into context', message: 'Your current subject and lesson are being carried into the conversation.', joke: 'LEO promises not to explain “hi” as a twelve-mark answer.' },
      { title: 'Setting up a clearer explanation', message: 'Examples, steps and language preference are being prepared.', joke: 'Confusion entered the chat. LEO entered right after it.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/coding'),
    lines: [
      { title: 'Opening Coding Lab', message: 'Editor, output and debugging tools are getting into position.', joke: 'The code works in my imagination. Now let’s test reality.' },
      { title: 'Preparing a safe place to break things', message: 'Predict, run, inspect and fix without losing the learning context.', joke: 'Semicolons are small. Their confidence is enormous.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/planner'),
    lines: [
      { title: 'Balancing the week', message: 'Study blocks are being arranged around real time, not fantasy productivity.', joke: 'A six-hour plan for a forty-minute evening has been politely rejected.' },
      { title: 'Making the plan practical', message: 'Deadlines, revision and buffer time are being considered together.', joke: 'Your timetable now includes the rare subject called “breathing”.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/materials'),
    lines: [
      { title: 'Opening detailed materials', message: 'The complete notes stay here so the Learn page can remain focused.', joke: 'These notes are detailed enough to need their own attendance.' },
      { title: 'Finding the right chapter', message: 'Lesson structure, examples and diagrams are being kept together.', joke: 'Scroll responsibly. Hydration breaks are still allowed.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/analytics'),
    lines: [
      { title: 'Turning activity into insight', message: 'Progress, consistency and weak areas are being separated from vanity numbers.', joke: 'The graph is not judging you. It merely has excellent memory.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/notebook'),
    lines: [
      { title: 'Opening your learning memory', message: 'Notes, formulas, questions and mistakes are being kept in one place.', joke: 'The notebook remembers what “I’ll remember this” usually forgets.' },
    ],
  },
  {
    match: (pathname) => pathname.startsWith('/dashboard'),
    lines: [
      { title: 'Preparing your day', message: 'Only the most useful next actions are coming forward.', joke: 'Dashboard rule: fewer numbers, more actual studying.' },
    ],
  },
]

const DEFAULT_LINES: EngagementLine[] = [
  { title: 'Moving through Learnio', message: 'Keeping your learning context while the next workspace opens.', joke: 'Smooth transition loading. Dramatic cape not required.' },
  { title: 'Preparing the next workspace', message: 'The page is changing; your progress is staying put.', joke: 'This is the only kind of page turning that needs no bookmark.' },
  { title: 'Almost there', message: 'Useful controls first, decorative noise last.', joke: 'The loading spinner has been asked to keep this brief.' },
]

export const STUDY_COACH_LINES: EngagementLine[] = [
  { title: 'Start with one useful win', message: 'Complete the next lesson step before opening another subject.', joke: 'Ten open tabs do not combine into one completed lesson.' },
  { title: 'Use practice as a diagnosis', message: 'A wrong answer tells you exactly what to revise next.', joke: 'Mistakes are free analytics with slightly worse branding.' },
  { title: 'Protect your focus block', message: 'Pick one task, set a timer and hide the rest of the interface.', joke: 'Multitasking is just context switching wearing sunglasses.' },
  { title: 'Explain it out loud', message: 'If the explanation becomes vague, ask LEO for a simpler example.', joke: 'The rubber duck is on leave. LEO is covering the shift.' },
  { title: 'Stop before exhaustion', message: 'Finish a small checkpoint and leave a clear next step for tomorrow.', joke: 'Your brain is not a background npm process.' },
  { title: 'Revise before it feels urgent', message: 'A five-minute recall session beats rereading everything before the exam.', joke: 'Future-you has sent a thank-you message in advance.' },
]

export function engagementLineForRoute(pathname: string, seed = 0): EngagementLine {
  const group = ROUTE_LINES.find((entry) => entry.match(pathname))?.lines ?? DEFAULT_LINES
  const normalizedSeed = Math.abs(seed + hashString(pathname))
  return group[normalizedSeed % group.length]
}

export function studyCoachLine(seed = 0): EngagementLine {
  return STUDY_COACH_LINES[Math.abs(seed) % STUDY_COACH_LINES.length]
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash
}
