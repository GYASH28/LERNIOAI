'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { TutorView } from '@/components/views/tutor'

/**
 * The legacy TutorView is retained for its mature streaming/session UI, but
 * diploma Subject records must never be injected into it during the academic
 * transformation. Academic context is provided separately by the new profile
 * and route metadata instead of semester-scoped subject IDs.
 */
export function TutorAcademicClient() {
  useEffect(() => {
    useAppStore.setState({ subjects: [] })
  }, [])

  return <TutorView />
}
