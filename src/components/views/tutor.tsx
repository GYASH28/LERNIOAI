'use client'

import { TutorChatGPTWorkspace } from './tutor-chatgpt'
import { useAppStore } from '@/store/app-store'

export function TutorView() {
  const { subjects, user } = useAppStore()
  return (
    <TutorChatGPTWorkspace
      initialSubjects={subjects}
      userName={user?.name || 'Learner'}
    />
  )
}
