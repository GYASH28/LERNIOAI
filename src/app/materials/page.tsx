import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { BookOpen, Download, ArrowLeft, FileText, Star } from 'lucide-react'
import { MaterialsList } from './materials-list'

export const dynamic = 'force-dynamic'

const PY_PAPERS = [
  { code: 'R23CP2402', name: 'Data Structures — Question Papers', url: '/lesson-notes/r23cp2402-data-structures.pdf', type: 'Previous Year Papers' },
  { code: 'R23CP6404', name: 'OOP with C++ — Question Papers', url: '/lesson-notes/r23cp6404-object-oriented-programming-with-c.pdf', type: 'Previous Year Papers' },
  { code: 'R23CP1401', name: 'Programming in C — Question Papers', url: '/lesson-notes/r23cp1401-programming-in-c.pdf', type: 'Previous Year Papers' },
  { code: 'R23CP2407', name: 'DBMS — Question Papers', url: '/lesson-notes/r23cp2407-database-management-system.pdf', type: 'Previous Year Papers' },
  { code: 'R23CP2406', name: 'Operating System — Question Papers', url: '/lesson-notes/r23cp2406-operating-system.pdf', type: 'Previous Year Papers' },
  { code: 'R23CP2408', name: 'Computer Networks — Question Papers', url: '/lesson-notes/r23cp2408-computer-networks.pdf', type: 'Previous Year Papers' },
]

export default async function MaterialsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/materials')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <h1 className="text-2xl font-bold">Materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">Study notes, question papers, and resources for all subjects.</p>

        {/* Previous Year Papers Section */}
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" /><h2 className="text-lg font-semibold">Previous Year Question Papers</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PY_PAPERS.map(p => (
              <a key={p.code} href={p.url} download className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase text-muted-foreground">{p.code}</p><h3 className="mt-1 text-sm font-medium leading-tight">{p.name}</h3></div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10"><FileText className="h-4 w-4 text-amber-600" /></div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary opacity-0 group-hover:opacity-100"><Download className="h-3 w-3" />Download</div>
              </a>
            ))}
          </div>
        </section>

        {/* Study Notes Section */}
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Study Notes (All Subjects)</h2></div>
          <p className="mb-4 text-xs text-muted-foreground">48 PDF study notes covering all 6 semesters. Includes study guides, YouTube resources, and practice questions.</p>
          <MaterialsList pdfs={ALL_PDFS} />
        </section>
      </div>
    </main>
  )
}

const ALL_PDFS = [
  { code: 'R23CP1701', name: 'Basic Mathematics', semester: 1, credits: 4, category: 'theory', url: '/lesson-notes/r23cp1701-basic-mathematics.pdf', hasDetailedNotes: false },
  { code: 'R23CP2701', name: 'Basic Science', semester: 1, credits: 4, category: 'theory', url: '/lesson-notes/r23cp2701-basic-science.pdf', hasDetailedNotes: false },
  { code: 'R23CP1702', name: 'Communication Skills - English', semester: 1, credits: 2, category: 'theory', url: '/lesson-notes/r23cp1702-communication-skills---english.pdf', hasDetailedNotes: false },
  { code: 'R23CP2201', name: 'Engineering Graphics', semester: 1, credits: 4, category: 'theory', url: '/lesson-notes/r23cp2201-engineering-graphics.pdf', hasDetailedNotes: false },
  { code: 'R23CP6401', name: 'Engineering Workshop Practice', semester: 1, credits: 4, category: 'practical', url: '/lesson-notes/r23cp6401-engineering-workshop-practice.pdf', hasDetailedNotes: false },
  { code: 'R23CP6402', name: 'Fundamentals of ICT', semester: 1, credits: 4, category: 'theory', url: '/lesson-notes/r23cp6402-fundamentals-of-ict.pdf', hasDetailedNotes: false },
  { code: 'R23CP4701', name: 'Yoga and Meditation', semester: 1, credits: 2, category: 'theory', url: '/lesson-notes/r23cp4701-yoga-and-meditation.pdf', hasDetailedNotes: false },
  { code: 'R23CP1703', name: 'Applied Mathematics', semester: 2, credits: 4, category: 'theory', url: '/lesson-notes/r23cp1703-applied-mathematics.pdf', hasDetailedNotes: false },
  { code: 'R23CP1401', name: 'Programming in C', semester: 2, credits: 5, category: 'theory', url: '/lesson-notes/r23cp1401-programming-in-c.pdf', hasDetailedNotes: true },
  { code: 'R23CP2401', name: 'Linux Basics', semester: 2, credits: 4, category: 'theory', url: '/lesson-notes/r23cp2401-linux-basics.pdf', hasDetailedNotes: false },
  { code: 'R23CP6403', name: 'Web Page Designing', semester: 2, credits: 5, category: 'theory', url: '/lesson-notes/r23cp6403-web-page-designing.pdf', hasDetailedNotes: false },
  { code: 'R23CP6701', name: 'Professional Communication', semester: 2, credits: 2, category: 'theory', url: '/lesson-notes/r23cp6701-professional-communication.pdf', hasDetailedNotes: false },
  { code: 'R23CP4401', name: 'Social and Life Skills', semester: 2, credits: 2, category: 'theory', url: '/lesson-notes/r23cp4401-social-and-life-skills.pdf', hasDetailedNotes: false },
  { code: 'R23CI1301', name: 'Basic Electrical and Electronics Engineering', semester: 2, credits: 4, category: 'theory', url: '/lesson-notes/r23ci1301-basic-electrical-and-electronics-engineering.pdf', hasDetailedNotes: false },
  { code: 'R23CP2402', name: 'Data Structures', semester: 3, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2402-data-structures.pdf', hasDetailedNotes: true },
  { code: 'R23CP6404', name: 'Object Oriented Programming with C++', semester: 3, credits: 5, category: 'theory', url: '/lesson-notes/r23cp6404-object-oriented-programming-with-c.pdf', hasDetailedNotes: true },
  { code: 'R23CP2405', name: 'User Interface Programming', semester: 3, credits: 4, category: 'practical', url: '/lesson-notes/r23cp2405-user-interface-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1402', name: 'Animation Techniques', semester: 3, credits: 4, category: 'practical', url: '/lesson-notes/r23cp1402-animation-techniques.pdf', hasDetailedNotes: false },
  { code: 'R23CP2403', name: 'Microprocessors and Its Programming', semester: 3, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2403-microprocessors-and-its-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP2404', name: 'Data Communication', semester: 3, credits: 4, category: 'theory', url: '/lesson-notes/r23cp2404-data-communication.pdf', hasDetailedNotes: false },
  { code: 'R23CI2603', name: 'Digital Techniques and Microcontroller', semester: 3, credits: 5, category: 'theory', url: '/lesson-notes/r23ci2603-digital-techniques-and-microcontroller.pdf', hasDetailedNotes: false },
  { code: 'R23CI2604', name: 'IoT and Its Application', semester: 3, credits: 5, category: 'theory', url: '/lesson-notes/r23ci2604-iot-and-its-application.pdf', hasDetailedNotes: false },
  { code: 'R23CP2406', name: 'Operating System', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2406-operating-system.pdf', hasDetailedNotes: false },
  { code: 'R23CI2606', name: 'Embedded Operating Systems', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23ci2606-embedded-operating-systems.pdf', hasDetailedNotes: false },
  { code: 'R23CP2407', name: 'Database Management System', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2407-database-management-system.pdf', hasDetailedNotes: false },
  { code: 'R23CP2408', name: 'Computer Networks', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2408-computer-networks.pdf', hasDetailedNotes: false },
  { code: 'R23CP1403', name: 'Python Programming', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23cp1403-python-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1404', name: 'Java Programming', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23cp1404-java-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CI2609', name: 'IoT Architecture and Protocols', semester: 4, credits: 5, category: 'theory', url: '/lesson-notes/r23ci2609-iot-architecture-and-protocols.pdf', hasDetailedNotes: false },
  { code: 'R23CP6405', name: 'Entrepreneurship Development and Marketing Management', semester: 4, credits: 3, category: 'theory', url: '/lesson-notes/r23cp6405-entrepreneurship-development-and-marketing-management.pdf', hasDetailedNotes: false },
  { code: 'R23CP2409', name: 'Software Engineering', semester: 5, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2409-software-engineering.pdf', hasDetailedNotes: false },
  { code: 'R23CP1405', name: 'Advanced Java Programming', semester: 5, credits: 5, category: 'theory', url: '/lesson-notes/r23cp1405-advanced-java-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP1406', name: 'PHP Programming', semester: 5, credits: 5, category: 'theory', url: '/lesson-notes/r23cp1406-php-programming.pdf', hasDetailedNotes: false },
  { code: 'R23CP3401', name: 'Recent Trends in Computer Networks', semester: 5, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3401-recent-trends-in-computer-networks.pdf', hasDetailedNotes: false },
  { code: 'R23CP3402', name: 'Database Architecture and Emerging Technologies', semester: 5, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3402-database-architecture-and-emerging-technologies.pdf', hasDetailedNotes: false },
  { code: 'R23CP3403', name: 'Fundamentals of Data Science', semester: 5, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3403-fundamentals-of-data-science.pdf', hasDetailedNotes: false },
  { code: 'R23CI2611', name: 'Wireless Ad Hoc Network', semester: 5, credits: 4, category: 'theory', url: '/lesson-notes/r23ci2611-wireless-ad-hoc-network.pdf', hasDetailedNotes: false },
  { code: 'R23CI2612', name: 'IoT in Robotics', semester: 5, credits: 4, category: 'practical', url: '/lesson-notes/r23ci2612-iot-in-robotics.pdf', hasDetailedNotes: false },
  { code: 'R23CP5401', name: 'Seminar, Capstone Initiation and Internship Support', semester: 5, credits: 3, category: 'project', url: '/lesson-notes/r23cp5401-seminar-capstone-initiation-and-internship-support.pdf', hasDetailedNotes: false },
  { code: 'R23CP1408', name: 'Industrial Management for IT Industry', semester: 6, credits: 4, category: 'theory', url: '/lesson-notes/r23cp1408-industrial-management-for-it-industry.pdf', hasDetailedNotes: false },
  { code: 'R23CP2410', name: 'Emerging Trends in Computer Engineering', semester: 6, credits: 4, category: 'theory', url: '/lesson-notes/r23cp2410-emerging-trends-in-computer-engineering.pdf', hasDetailedNotes: false },
  { code: 'R23CP2411', name: 'Machine Learning', semester: 6, credits: 5, category: 'theory', url: '/lesson-notes/r23cp2411-machine-learning.pdf', hasDetailedNotes: false },
  { code: 'R23CP6406', name: 'AI Tools and Techniques', semester: 6, credits: 4, category: 'theory', url: '/lesson-notes/r23cp6406-ai-tools-and-techniques.pdf', hasDetailedNotes: false },
  { code: 'R23CP6407', name: 'Software Testing Tools and Automation', semester: 6, credits: 5, category: 'theory', url: '/lesson-notes/r23cp6407-software-testing-tools-and-automation.pdf', hasDetailedNotes: false },
  { code: 'R23CP3404', name: 'Network and Information Security', semester: 6, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3404-network-and-information-security.pdf', hasDetailedNotes: false },
  { code: 'R23CP3405', name: 'Cloud Computing', semester: 6, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3405-cloud-computing.pdf', hasDetailedNotes: false },
  { code: 'R23CP3406', name: 'Data Analytics and Visualization using R', semester: 6, credits: 4, category: 'elective', url: '/lesson-notes/r23cp3406-data-analytics-and-visualization-using-r.pdf', hasDetailedNotes: false },
  { code: 'R23CP5402', name: 'Capstone Project Support', semester: 6, credits: 6, category: 'project', url: '/lesson-notes/r23cp5402-capstone-project-support.pdf', hasDetailedNotes: false },
]
