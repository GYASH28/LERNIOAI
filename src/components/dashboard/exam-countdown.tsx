'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Clock, AlertCircle } from 'lucide-react'

/**
 * Exam countdown widget.
 * Shows days remaining until the exam date set in the user's profile.
 * Auto-generates a study plan 30 days before the exam.
 */
export function ExamCountdown({ examDate }: { examDate: string | null }) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!examDate) return
    const exam = new Date(examDate)
    const now = new Date()
    const diff = Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    setDaysLeft(diff)
  }, [examDate])

  if (!examDate || daysLeft === null) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Exam Countdown</h3>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Set your exam date in <Link href="/settings" className="text-primary hover:underline">Settings</Link> to see a countdown and study plan.
        </p>
      </div>
    )
  }

  const isUrgent = daysLeft <= 30 && daysLeft > 0
  const isPast = daysLeft < 0

  return (
    <div className={`rounded-lg border p-4 ${isUrgent ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        {isUrgent ? <AlertCircle className="h-5 w-5 text-orange-500" /> : <Calendar className="h-5 w-5 text-primary" />}
        <h3 className="text-sm font-semibold">Exam Countdown</h3>
      </div>
      {isPast ? (
        <p className="mt-2 text-sm text-muted-foreground">Your exam date has passed. Set a new one in Settings.</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold text-primary">{daysLeft}</p>
          <p className="text-xs text-muted-foreground">days until your exam ({new Date(examDate).toLocaleDateString('en-IN')})</p>
          {isUrgent && (
            <div className="mt-3 rounded-md bg-orange-500/10 p-2">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                ⚡ Study Plan Active: Focus on weak topics and revision. Aim for 3+ hours daily.
              </p>
            </div>
          )}
          {daysLeft <= 60 && daysLeft > 30 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Start preparing! Generate a study plan from the Planner.
            </p>
          )}
        </>
      )}
    </div>
  )
}
