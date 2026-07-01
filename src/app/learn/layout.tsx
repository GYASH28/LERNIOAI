import { getAppBootstrap } from '@/lib/app-bootstrap'
import { LearningApp } from '@/components/app/learning-app'

export const dynamic = 'force-dynamic'

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getAppBootstrap('learn')

  return (
    <LearningApp
      initialView="learn"
      initialUser={bootstrap.user}
      initialSubjects={bootstrap.subjects}
      initialDashboard={bootstrap.dashboard}
    >
      {children}
    </LearningApp>
  )
}
