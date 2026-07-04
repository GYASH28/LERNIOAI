'use client'

import { useState } from 'react'
import { Users, Crown, ChevronDown, ChevronRight, GraduationCap, Mail } from 'lucide-react'

export function TeacherClassesClient({ classesBySemester }: { classesBySemester: Record<number, any[]> }) {
  const [expandedSem, setExpandedSem] = useState<number | null>(1)

  const semesterNames: Record<number, string> = {
    1: 'Semester 1',
    2: 'Semester 2',
    3: 'Semester 3',
    4: 'Semester 4',
    5: 'Semester 5',
    6: 'Semester 6',
  }

  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map(sem => {
        const classes = classesBySemester[sem] || []
        const isExpanded = expandedSem === sem
        const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)

        return (
          <div key={sem} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Semester header */}
            <button
              onClick={() => setExpandedSem(isExpanded ? null : sem)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">{semesterNames[sem]}</p>
                  <p className="text-xs text-muted-foreground">
                    {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {totalStudents} students
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Classes */}
            {isExpanded && (
              <div className="border-t border-border divide-y divide-border">
                {classes.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No classes created for this semester yet.</p>
                ) : (
                  classes.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-xs font-bold text-violet-500">
                        {c.division}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Division {c.division}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.studentCount} students</span>
                          {c.cr && (
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3 text-amber-500" />
                              CR: {c.cr.name}
                              <a href={`mailto:${c.cr.email}`} className="hover:text-primary">
                                <Mail className="h-3 w-3" />
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={`/attendance`}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-accent/50 transition-colors"
                      >
                        Take Attendance
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
