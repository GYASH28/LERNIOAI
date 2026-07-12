import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { MaterialsList } from './materials-list'

export const dynamic = 'force-dynamic'

// Study note PDFs — these are actual study notes, NOT previous year papers
const STUDY_NOTES = [
  { code: 'R23CP2402', name: 'Data Structures', semester: 3, credits: 5, category: 'Core', url: '/lesson-notes/r23cp2402-data-structures.pdf', hasDetailedNotes: true },
  { code: 'R23CP6404', name: 'Object Oriented Programming with C++', semester: 3, credits: 5, category: 'Core', url: '/lesson-notes/r23cp6404-object-oriented-programming-with-c.pdf', hasDetailedNotes: true },
  { code: 'R23CP1401', name: 'Programming in C', semester: 1, credits: 5, category: 'Core', url: '/lesson-notes/r23cp1401-programming-in-c.pdf', hasDetailedNotes: true },
  { code: 'R23CP2407', name: 'Database Management System', semester: 3, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2407-database-management-system.pdf', hasDetailedNotes: false },
  { code: 'R23CP2406', name: 'Operating System', semester: 3, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2406-operating-system.pdf', hasDetailedNotes: false },
  { code: 'R23CP2408', name: 'Computer Networks', semester: 3, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2408-computer-networks.pdf', hasDetailedNotes: false },
  { code: 'R23CP2405', name: 'User Interface Programming', semester: 3, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2405-user-interface-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP2403', name: 'Microprocessors and Its Programming', semester: 3, credits: 5, category: 'Core', url: '/lesson-notes/r23cp2403-microprocessors-and-its-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP2404', name: 'Data Communication', semester: 3, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2404-data-communication.pdf', hasDetailedNotes: false },
  { code: 'R23CP1402', name: 'Animation Techniques', semester: 1, credits: 4, category: 'Core', url: '/lesson-notes/r23cp1402-animation-techniques.pdf', hasDetailedNotes: false },
  { code: 'R23CP1403', name: 'Python Programming', semester: 1, credits: 5, category: 'Core', url: '/lesson-notes/r23cp1403-python-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1405', name: 'Advanced Java Programming', semester: 1, credits: 5, category: 'Core', url: '/lesson-notes/r23cp1405-advanced-java-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1406', name: 'PHP Programming', semester: 1, credits: 4, category: 'Core', url: '/lesson-notes/r23cp1406-php-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1408', name: 'Industrial Management for IT Industry', semester: 1, credits: 4, category: 'Core', url: '/lesson-notes/r23cp1408-industrial-management-for-it-industry.pdf', hasDetailedNotes: false },
  { code: 'R23CP2201', name: 'Engineering Graphics', semester: 2, credits: 4, category: 'Core', url: '/lesson-notes/r23cp2201-engineering-graphics.pdf', hasDetailedNotes: false },
  { code: 'R23CP1701', name: 'Basic Mathematics', semester: 1, credits: 5, category: 'Foundation', url: '/lesson-notes/r23cp1701-basic-mathematics.pdf', hasDetailedNotes: false },
  { code: 'R23CP1702', name: 'Communication Skills - English', semester: 1, credits: 4, category: 'Foundation', url: '/lesson-notes/r23cp1702-communication-skills---english.pdf', hasDetailedNotes: false },
  { code: 'R23CP1703', name: 'Applied Mathematics', semester: 2, credits: 5, category: 'Foundation', url: '/lesson-notes/r23cp1703-applied-mathematics.pdf', hasDetailedNotes: false },
  { code: 'R23CP2701', name: 'Basic Science', semester: 2, credits: 5, category: 'Foundation', url: '/lesson-notes/r23cp2701-basic-science.pdf', hasDetailedNotes: false },
]

export default async function MaterialsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/materials')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">Study Materials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Download PDF study notes for all subjects. Search by name or filter by semester.
          </p>
          <div className="mt-6">
            <MaterialsList pdfs={STUDY_NOTES} />
          </div>

          {/* Previous Year Question Papers — labeled honestly */}
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-2">Practice Question Papers</h2>
            <p className="text-sm text-muted-foreground mb-4">
              AI-generated practice papers based on the R23 curriculum pattern. These are study aids, not official university papers.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <p className="font-semibold text-amber-600">📝 Practice papers coming soon</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We are generating practice question papers for each subject based on the official R23 syllabus pattern.
                These will be clearly labeled as practice papers, not previous year university papers.
                Check back soon or visit the Exams page for AI-generated quizzes.
              </p>
              <a href="/exams" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
                Go to Exams & Practice Tests →
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
