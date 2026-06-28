import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { CinematicIntro } from '@/components/marketing/cinematic-intro'
import { LandingMotionController } from '@/components/marketing/landing-motion-controller'
import { PublicHeader } from '@/components/marketing/public-header'
import { Hero } from '@/components/marketing/hero'
import { AcademicIntelligenceOS } from '@/components/marketing/academic-intelligence-os'
import { LearningPath } from '@/components/marketing/learning-path'
import { LearningModesDemo } from '@/components/marketing/learning-modes-demo'
import { TutorDemo } from '@/components/marketing/tutor-demo'
import { ExamRevisionDemo } from '@/components/marketing/exam-revision-demo'
import { LabsSection } from '@/components/marketing/labs-section'
import { CampusSection } from '@/components/marketing/campus-section'
import { RolesSection } from '@/components/marketing/roles-section'
import { TrustSection } from '@/components/marketing/trust-section'
import { FAQ } from '@/components/marketing/faq'
import { FinalCTA } from '@/components/marketing/final-cta'
import { PublicFooter } from '@/components/marketing/public-footer'

const SITE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Lernio AI',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description:
    'An adaptive learning workspace for diploma engineering students. Learn, practise, revise and prepare for exams from one personalised workspace.',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Lernio AI',
  },
}

export default async function LandingPage() {
  const currentUser = await getCurrentUser().catch(() => null)
  const isAuthenticated = Boolean(currentUser)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
      />

      <CinematicIntro />
      <LandingMotionController />
      <PublicHeader isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        <Hero isAuthenticated={isAuthenticated} />
        <AcademicIntelligenceOS />
        <LearningPath />
        <LearningModesDemo />
        <TutorDemo />
        <ExamRevisionDemo />
        <LabsSection />
        <CampusSection />
        <RolesSection />
        <TrustSection />
        <FAQ />
        <FinalCTA isAuthenticated={isAuthenticated} />
      </main>

      <PublicFooter />
    </div>
  )
}
