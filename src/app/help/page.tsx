import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { BookOpen, Bot, Calendar, BarChart3, Code2, FlaskConical, RotateCw, PenTool, FileText, Library, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const HELP_CATEGORIES: { title: string; icon: LucideIcon; articles: { title: string; href: string; description: string }[] }[] = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    articles: [
      { title: 'How to use the Learn section', href: '/help/learn', description: 'Browse your curriculum, watch lectures, and track progress.' },
      { title: 'Complete your profile', href: '/help/profile', description: 'Set your programme, semester, and exam date for personalised recommendations.' },
      { title: 'Understanding the dashboard', href: '/help/dashboard', description: 'Learn what each widget shows and how to use it.' },
    ],
  },
  {
    title: 'AI Tutor (LEO)',
    icon: Bot,
    articles: [
      { title: 'How to ask LEO questions', href: '/help/leo', description: 'Get AI-powered help with any topic in your syllabus.' },
      { title: 'LEO best practices', href: '/help/leo-tips', description: 'Tips for getting the best answers from LEO.' },
    ],
  },
  {
    title: 'Study Tools',
    icon: PenTool,
    articles: [
      { title: 'Using the planner', href: '/help/planner', icon: Calendar, description: 'Auto-plan your study week based on weak topics.' },
      { title: 'Practice and quizzes', href: '/help/practice', description: 'Take practice quizzes and track your accuracy.' },
      { title: 'Revision system', href: '/help/revision', description: 'Spaced-repetition flashcards for exam prep.' },
      { title: 'Coding lab', href: '/help/coding', description: 'Write and run code in the browser.' },
    ],
  },
  {
    title: 'Progress & Analytics',
    icon: BarChart3,
    articles: [
      { title: 'Understanding readiness', href: '/help/readiness', description: 'How we calculate your exam readiness score.' },
      { title: 'XP and streaks', href: '/help/xp', description: 'How to earn XP and maintain your streak.' },
      { title: 'Achievements', href: '/help/achievements', description: 'Unlock badges by completing milestones.' },
    ],
  },
]

export default async function HelpPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/help')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn how to get the most out of Lernio AI.
        </p>

        <div className="mt-8 space-y-8">
          {HELP_CATEGORIES.map((category) => (
            <div key={category.title}>
              <div className="mb-3 flex items-center gap-2">
                <category.icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{category.title}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.articles.map((article) => (
                  <Link
                    key={article.href}
                    href={article.href}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5"
                  >
                    <h3 className="text-sm font-semibold">{article.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{article.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
          <h2 className="text-sm font-semibold text-primary">Still need help?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the feedback button at the bottom-right corner to send us a message.
          </p>
        </div>
      </div>
    </main>
  )
}
