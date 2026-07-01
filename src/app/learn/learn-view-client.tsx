'use client'

import { LearnView } from '@/components/views/learn'
import { AppPageShell } from '@/components/app/app-page-shell'
import { MotionPage } from '@/components/motion'

export function LearnViewClient() {
  return (
    <AppPageShell variant="reading">
      <MotionPage viewKey="learn">
        <LearnView />
      </MotionPage>
    </AppPageShell>
  )
}

