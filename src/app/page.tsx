import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { HyperframesIntro } from '@/components/marketing/hyperframes-intro'
import introGateStyles from '@/components/marketing/landing-intro-gate.module.css'
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
import { HYPERFRAMES_INTRO_STORAGE_KEY } from '@/lib/motion/hyperframes-intro'

const SITE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  alternates: { canonical: '/' },
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
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  publisher: { '@type': 'Organization', name: 'Lernio AI' },
}

const introBootstrap = `(function(){try{var root=document.documentElement;var seen=sessionStorage.getItem(${JSON.stringify(HYPERFRAMES_INTRO_STORAGE_KEY)})==='complete';var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||root.dataset.motion==='reduced'||root.dataset.motion==='none';root.dataset.landingIntro=(seen||reduced)?'complete':'pending';window.setTimeout(function(){if(root.dataset.landingIntro!=='complete'){root.dataset.landingIntro='complete';}},5200);}catch(e){document.documentElement.dataset.landingIntro='complete';}})();`

export default async function LandingPage() {
  const [authUser, requestHeaders] = await Promise.all([
    getCurrentUser().catch(() => null),
    headers(),
  ])
  const isAuthenticated = Boolean(authUser)
  const nonce = requestHeaders.get('x-nonce') ?? undefined

  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: introBootstrap }} />
      <HyperframesIntro />
      <div
        data-landing-content
        className={`${introGateStyles.content} flex min-h-screen flex-col bg-background text-foreground`}
      >
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
        />

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
    </>
  )
}
