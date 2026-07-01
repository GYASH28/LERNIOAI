import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Help Center
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Article not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This help article doesn&apos;t exist yet.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
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
  )
}
