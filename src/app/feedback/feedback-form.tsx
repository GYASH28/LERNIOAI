'use client'

import { useState } from 'react'
import { Star, Send, Bug, Lightbulb, Heart, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const TYPE_ICONS = { bug: Bug, idea: Lightbulb, praise: Heart, question: HelpCircle }
const TYPE_LABELS = { bug: 'Bug Report', idea: 'Feature Idea', praise: 'Praise', question: 'Question' }

export function FeedbackForm() {
  const [rating, setRating] = useState(0)
  const [type, setType] = useState<'bug' | 'idea' | 'praise' | 'question'>('idea')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!description.trim() || rating === 0) {
      setError('Please provide a rating and description.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          type,
          description,
          pageUrl: window.location.href,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setSubmitted(true)
      setRating(0)
      setDescription('')
      setType('idea')
    } catch {
      setError('Could not submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <Heart className="h-6 w-6 fill-green-600 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">Thank you!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your feedback has been received. We&apos;ll review it and get back to you if needed.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Send another
        </button>
        <Link
          href="/dashboard"
          className="mt-2 block text-xs text-muted-foreground hover:text-primary"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
      {/* Rating */}
      <div>
        <label className="text-sm font-medium">How was your experience?</label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1"
              aria-label={`${star} out of 5 stars`}
            >
              <Star
                className={`h-7 w-7 transition-transform hover:scale-110 ${
                  star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="text-sm font-medium">What type of feedback?</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['bug', 'idea', 'praise', 'question'] as const).map((t) => {
            const Icon = TYPE_ICONS[t]
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-xs font-medium transition-colors ${
                  type === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-4 w-4" />
                {TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Tell us more</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-y"
          placeholder="Describe the issue, your idea, or what you liked..."
        />
        <p className="mt-1 text-xs text-muted-foreground">{description.length} / 5000 characters</p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Sending...' : 'Send feedback'}
      </button>
    </div>
  )
}
