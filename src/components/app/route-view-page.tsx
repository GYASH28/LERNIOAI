import { LearningApp } from '@/components/app/learning-app'
import { getAppBootstrap } from '@/lib/app-bootstrap'
import type { ViewKey } from '@/lib/types'

export async function RouteViewPage({ view }: { view: ViewKey }) {
  const bootstrap = await getAppBootstrap(view)

  return (
    <div className="[&_.app-main-container]:pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:[&_.app-main-container]:pb-0 [&_.app-main-container>footer]:hidden md:[&_.app-main-container>footer]:block">
      <LearningApp
        initialView={view}
        initialUser={bootstrap.user}
        initialSubjects={bootstrap.subjects}
        initialDashboard={bootstrap.dashboard}
      />
    </div>
  )
}
