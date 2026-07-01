'use client'
import { ErrorRecovery } from '@/components/app/error-recovery'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorRecovery error={error} reset={reset} title="Achievements error" />
}
