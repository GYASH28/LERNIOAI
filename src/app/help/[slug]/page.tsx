import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

const ARTICLES: Record<string, { title: string; content: string[] }> = {
  learn: {
    title: 'How to use the Learn section',
    content: [
      'The Learn section is the heart of Lernio AI. It shows your exact curriculum for your programme (Computer Engineering or Computer Engineering & IoT) and semester.',
      'To start learning: 1) Click "Learn" in the sidebar. 2) You\'ll see your current semester with all applicable subjects. 3) Click any subject to see curated YouTube lecture playlists. 4) Click "Open Lesson" to access the full lesson studio with video player, notes, and study tools.',
      'Each subject has a primary lecture playlist (closest match to your CWIT R23 syllabus) and alternate playlists for different explanations. Watch the primary playlist first, then use alternates if a topic is unclear.',
      'For programming subjects (C, C++, Python, Java, Web Design), don\'t just watch — type out every code example yourself. For practical subjects (Linux, Workshop, Electronics), repeat each step on your own machine.',
    ],
  },
  profile: {
    title: 'Complete your profile',
    content: [
      'Completing your profile helps Lernio personalise your learning experience.',
      'Visit the Profile page to set: your preferred language (English/Hindi/Marathi), your exam date (for countdown and planning), your daily study goal (minutes per day), and your institution/programme/semester.',
      'New OAuth (Google) users are auto-assigned to DCOMP Semester 3. You can change this in your profile settings.',
    ],
  },
  leo: {
    title: 'How to ask LEO questions',
    content: [
      'LEO is your AI tutor, powered by Groq. It can answer questions about any topic in your syllabus.',
      'To use LEO: 1) Click "AI Tutor" in the sidebar. 2) Type your question in natural language (English or Hinglish). 3) LEO will respond with a grounded answer, citing approved lesson content.',
      'LEO works best when you ask specific questions about topics in your curriculum. Instead of "explain data structures", try "explain how a linked list differs from an array with an example".',
      'LEO is context-aware — if you open a lesson first and then click "Ask LEO", the tutor will scope its answers to that lesson\'s content.',
    ],
  },
  dashboard: {
    title: 'Understanding the dashboard',
    content: [
      'The dashboard is your home base. It shows your streak, XP, today\'s class timetable, attendance percentage, recently viewed lessons, exam countdown, and quick actions.',
      'The "Continue Learning" card picks up where you left off. The "Streak Heatmap" shows your study activity over the last 12 weeks.',
      'If you see a "Complete your profile" banner, click it to set your department, semester, and division — this unlocks the class timetable and attendance features.',
    ],
  },
  'leo-tips': {
    title: 'LEO best practices',
    content: [
      'Be specific: "Explain the difference between TCP and UDP with examples" beats "explain networks".',
      'Use Hinglish if it helps you think: LEO supports English, Hinglish, and Marathi modes.',
      'Ask for examples: "Give me 3 worked examples of binary search" produces better answers than "what is binary search".',
      'Use the lesson context: open a lesson first, then ask LEO — the tutor will scope answers to that lesson.',
    ],
  },
  planner: {
    title: 'Using the planner',
    content: [
      'The planner auto-generates a study week based on your subjects, weak topics, and available time.',
      'Click "Generate Plan" to let LEO create a schedule. You can drag tasks to reorder, mark them complete, or add your own.',
      'The planner respects your daily study goal (set in Profile) and your exam date (for prioritisation).',
    ],
  },
  practice: {
    title: 'Practice and quizzes',
    content: [
      'The Practice section generates short quizzes (5 questions by default) from any subject.',
      'Choose a subject, click "Start", and answer questions one at a time. You\'ll get instant feedback with explanations.',
      'Your accuracy is tracked per subject — visit Analytics to see which subjects need more work.',
    ],
  },
  revision: {
    title: 'Revision system',
    content: [
      'The Revision section uses spaced repetition (SM-2 algorithm) to show flashcards right before you\'re about to forget them.',
      'Rate each card: Again, Hard, Good, or Easy. The system schedules the next review based on your rating.',
      'Cards are generated from your lesson notes — visit Materials to add more content to your revision deck.',
    ],
  },
  coding: {
    title: 'Coding lab',
    content: [
      'The Coding Lab lets you write and run C, C++, Java, and Python code in the browser — no setup required.',
      'Pick a language, type your code, and click "Run". Output appears in the console panel below.',
      'Use the coding lab to practise every example from your programming subjects. Typing code yourself builds muscle memory that watching videos cannot.',
    ],
  },
  readiness: {
    title: 'Understanding readiness',
    content: [
      'The readiness score (0-100%) estimates how prepared you are for your exams, based on: lessons completed, practice accuracy, revision consistency, and time invested.',
      'A score above 70% means you\'re on track. Below 40% means you should prioritise the weakest subjects shown in Analytics.',
      'The score updates daily as you complete lessons and quizzes.',
    ],
  },
  xp: {
    title: 'XP and streaks',
    content: [
      'XP (Experience Points) are awarded for: completing lessons (10 XP), answering practice questions (5 XP each), asking LEO questions (5 XP), and maintaining your streak (bonus daily).',
      'Streaks count consecutive days where you complete at least one learning activity. Miss a day and your streak resets to 0.',
      'Level up every 200 XP. Higher levels unlock cosmetic badges and appearance in the leaderboard.',
    ],
  },
  achievements: {
    title: 'Achievements',
    content: [
      'Achievements are badges you unlock by reaching milestones: first lesson, 7-day streak, 1000 XP, completing a full unit, etc.',
      'Visit the Achievements page to see your progress. Some achievements are hidden until you unlock them.',
      'Achievements are cosmetic — they don\'t affect your readiness score, but they\'re a fun way to stay motivated.',
    ],
  },
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/help')

  const { slug } = await params
  const article = ARTICLES[slug]

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <TopBar />
        <main className="flex-1 page-wipe">
          <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 lg:px-8">
            <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Help Center
            </Link>
            <h1 className="mt-4 text-2xl font-bold">Article not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">This help article doesn&apos;t exist yet. Check the Help Center for available articles.</p>
            <Link href="/help" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Help Center
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 lg:px-8">
          <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Help Center
          </Link>
          <h1 className="mt-4 text-2xl font-bold">{article.title}</h1>
          <div className="mt-6 space-y-4">
            {article.content.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
