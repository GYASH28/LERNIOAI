import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { TutorChatGPTWorkspace } from '@/components/views/tutor-chatgpt'
import { getAppBootstrap } from '@/lib/app-bootstrap'

export const dynamic = 'force-dynamic'

export default async function TutorPage() {
  const bootstrap = await getAppBootstrap('tutor')
  if (!bootstrap.user) redirect('/sign-in?callbackUrl=/tutor')

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <main className="flex min-h-0 flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <TutorChatGPTWorkspace
          initialSubjects={bootstrap.subjects}
          userName={bootstrap.user.name}
        />
      </main>
    </div>
  )
}
