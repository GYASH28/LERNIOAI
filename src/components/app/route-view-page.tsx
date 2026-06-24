import { LearningApp } from '@/components/app/learning-app'
import { getAppBootstrap } from '@/lib/app-bootstrap'
import type { ViewKey } from '@/lib/types'

export async function RouteViewPage({ view }: { view: ViewKey }) {
  const bootstrap = await getAppBootstrap(view)

  return (
    <LearningApp
      initialView={view}
      initialUser={bootstrap.user}
      initialSubjects={bootstrap.subjects}
      initialDashboard={bootstrap.dashboard}
    />
  )
}
