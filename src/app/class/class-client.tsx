'use client'

import { useState, useEffect } from 'react'
import { Users, Crown, GraduationCap, Mail, Loader2, Flame, Zap, ChevronRight } from 'lucide-react'

export function ClassClient() {
  const [classData, setClassData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/class?action=my-class')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setClassData(data.data)
        } else {
          setError(data.error || 'Failed to load class')
        }
      })
      .catch(() => setError('Failed to load class'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No class assigned yet. Complete your profile to join a class.</p>
      </div>
    )
  }

  const members = classData.members || []
  const cr = classData.cr

  return (
    <div className="space-y-6">
      {/* Class Info Header */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {classData.departmentCode} · Semester {classData.semesterNumber} · Division {classData.division}
            </h2>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'student' : 'students'}
              {classData.academicYear && ` · AY ${classData.academicYear}`}
            </p>
          </div>
        </div>

        {/* CR Info */}
        {cr && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-amber-500">Class Representative</p>
              <p className="text-sm font-semibold">{cr.name}</p>
            </div>
            <a href={`mailto:${cr.email}`} className="text-muted-foreground hover:text-primary">
              <Mail className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Classmates List */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Classmates</h3>
        <div className="space-y-2">
          {members.map((m: any, i: number) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                m.user.role === 'cr' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card hover:bg-accent/5'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(m.user.name || '?').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{m.user.name}</p>
                  {m.user.role === 'cr' && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {m.user.rollNumber || m.user.email}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {m.user.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-orange-500 font-medium">
                    <Flame className="h-3 w-3" />{m.user.streak}
                  </span>
                )}
                {m.user.xp > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                    <Zap className="h-3 w-3" />{m.user.xp}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
