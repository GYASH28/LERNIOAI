import { Suspense } from 'react'
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
        <Suspense fallback={<TutorWorkspaceSkeleton />}>
          <TutorChatGPTWorkspace
            initialSubjects={bootstrap.subjects}
            userName={bootstrap.user.name}
          />
        </Suspense>
      </main>
    </div>
  )
}

function TutorWorkspaceSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full animate-pulse">
      <div className="hidden w-72 border-r border-border bg-muted/30 p-4 md:block">
        <div className="h-11 rounded-xl bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-14 rounded-xl bg-muted" />)}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border" />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-muted" />
          <div className="mx-auto mt-5 h-8 w-64 rounded-lg bg-muted" />
          <div className="mx-auto mt-3 h-4 w-80 max-w-full rounded bg-muted" />
        </div>
        <div className="mx-auto mb-4 h-24 w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-border bg-muted/40" />
      </div>
    </div>
  )
}
