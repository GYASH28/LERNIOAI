'use client'

import { useState } from 'react'
import {
  User, Mail, Crown, Clock, Flame, Zap, Award, Edit2, Save, X,
  Users, ClipboardList, GraduationCap, Building2, Calendar, Hash,
  Phone, Shield, AlertTriangle, Loader2, ChevronRight, BookOpen,
} from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  rollNumber: string | null
  phone: string | null
  departmentCode: string | null
  departmentName: string | null
  semesterNumber: number | null
  division: string | null
  xp: number
  streak: number
  level: number
  avatar: string | null
  photoUrl: string | null
  examDate: string | null
  dailyMins: number
  preferredLang: string
  createdAt: string
  showPhoneToClassmates: boolean
  showEmailToClassmates: boolean
}

interface ClassInfo {
  id: string
  alias: string | null
  avatarEmoji: string | null
  avatarColor: string | null
  departmentCode: string
  semesterNumber: number
  division: string
  room: string | null
  cr: { id: string; name: string; email: string } | null
  _count: { members: number }
}

interface Props {
  userRole: string
  userId: string
  initialUser: UserData | null
  classInfo: ClassInfo | null
  attendancePct: number | null
  totalSessions: number
}

const DEPARTMENTS = [
  { code: 'DCOMP', name: 'Diploma in Computer Engineering' },
  { code: 'DCIOT', name: 'Diploma in Computer Engineering & IoT' },
]

export function ProfileClient({ userRole, userId, initialUser, classInfo, attendancePct, totalSessions }: Props) {
  const [user, setUser] = useState<UserData | null>(initialUser)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit form state
  const [name, setName] = useState(initialUser?.name || '')
  const [rollNumber, setRollNumber] = useState(initialUser?.rollNumber || '')
  const [phone, setPhone] = useState(initialUser?.phone || '')
  const [departmentCode, setDepartmentCode] = useState(initialUser?.departmentCode || 'DCOMP')
  const [semesterNumber, setSemesterNumber] = useState(initialUser?.semesterNumber || 3)
  const [division, setDivision] = useState(initialUser?.division || 'A')

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Failed to load profile.</p>
      </div>
    )
  }

  const isCR = userRole === 'cr'
  const isStaff = ['admin', 'coordinator', 'teacher'].includes(userRole)
  const isStudent = userRole === 'student' || isCR
  const needsClassSetup = isStudent && (!user.departmentCode || !user.semesterNumber || !user.division)

  const saveProfile = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, rollNumber, phone,
          departmentCode, semesterNumber: Number(semesterNumber), division,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save')
      }
      setUser(data.data)
      setEditing(false)
      setSuccess('Profile updated! Your class info has been saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setName(user.name || '')
    setRollNumber(user.rollNumber || '')
    setPhone(user.phone || '')
    setDepartmentCode(user.departmentCode || 'DCOMP')
    setSemesterNumber(user.semesterNumber || 3)
    setDivision(user.division || 'A')
    setError('')
  }

  const initials = (user.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const joinDate = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Profile completion warning */}
      {needsClassSetup && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-600">Complete your profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You haven&apos;t set your department, semester, or division yet. This is needed to join a class, see classmates, and track attendance.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="mt-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Set up now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile header card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-xl font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  {userRole}
                </span>
                {isCR && classInfo?.cr?.id === userId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500">
                    <Crown className="h-3 w-3" /> CR
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">Joined {joinDate}</span>
              </div>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/50 flex items-center gap-1.5"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <Flame className="h-4 w-4 text-orange-500 mx-auto" />
            <p className="mt-1 text-base font-bold">{user.streak}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Streak</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <Zap className="h-4 w-4 text-amber-500 mx-auto" />
            <p className="mt-1 text-base font-bold">{user.xp}</p>
            <p className="text-[9px] text-muted-foreground uppercase">XP</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <Award className="h-4 w-4 text-violet-500 mx-auto" />
            <p className="mt-1 text-base font-bold">L{user.level}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Level</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <Clock className="h-4 w-4 text-blue-500 mx-auto" />
            <p className="mt-1 text-base font-bold">{user.dailyMins}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Min/day</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Level {user.level}</span>
            <span>{user.xp} / {user.level * 200} XP</span>
            <span>Level {user.level + 1}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all"
              style={{ width: `${Math.min(100, (user.xp / (user.level * 200)) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground text-center">
            {Math.max(0, user.level * 200 - user.xp)} XP until your next level
          </p>
        </div>
      </div>

      {/* Success/error messages */}
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Edit form */}
      {editing ? (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Profile</h3>
            <button onClick={cancelEdit} className="rounded p-1 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              maxLength={100}
            />
          </div>

          {/* Roll number */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> Roll number
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 23/COMP/045"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              maxLength={32}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              maxLength={20}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Visible to classmates only if you enable it in Settings → Privacy.
            </p>
          </div>

          {/* Class info — only for students and CRs */}
          {isStudent && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
              <p className="text-xs font-bold uppercase text-amber-500 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Class Information
              </p>
              <p className="text-[10px] text-muted-foreground">
                Changing your class info will move you to a different class. You&apos;ll see new classmates and attendance.
              </p>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Department / Programme
                </label>
                <select
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Semester + Division */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Semester
                  </label>
                  <select
                    value={semesterNumber}
                    onChange={(e) => setSemesterNumber(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Division
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {['A', 'B', 'C'].map(d => (
                      <option key={d} value={d}>Division {d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Save/Cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/50"
            >
              Cancel
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Class info card (read-only) */}
          {isStudent && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Class Information
                </h3>
                <Link href="/class" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View class <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {needsClassSetup ? (
                <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center">
                  <p className="text-sm text-muted-foreground">No class set yet.</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Set up your class →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Class identity */}
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-lg">
                      {classInfo?.avatarEmoji || '🎓'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {classInfo?.alias || `Division ${user.division}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.departmentName || user.departmentCode} · Semester {user.semesterNumber} · Division {user.division}
                      </p>
                    </div>
                    {classInfo?._count?.members !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {classInfo._count.members} students
                      </span>
                    )}
                  </div>

                  {/* Class details grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Dept:</span>
                      <span className="font-medium">{user.departmentCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Semester:</span>
                      <span className="font-medium">{user.semesterNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Division:</span>
                      <span className="font-medium">{user.division}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Roll:</span>
                      <span className="font-medium">{user.rollNumber || '—'}</span>
                    </div>
                  </div>

                  {/* CR badge */}
                  {classInfo?.cr && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Class CR:</span>
                      <span className="text-sm font-medium">{classInfo.cr.name}</span>
                      {classInfo.cr.id === userId && (
                        <span className="text-[10px] font-bold uppercase text-amber-500">(You)</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendance card (students only) */}
          {isStudent && !needsClassSetup && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Attendance
                </h3>
                <Link href="/attendance" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center shrink-0">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                      className={(attendancePct ?? 0) >= 75 ? 'text-emerald-500' : 'text-red-500'}
                      strokeDasharray={`${2 * Math.PI * 34 * ((attendancePct ?? 0) / 100)} ${2 * Math.PI * 34}`}
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-xl font-bold">{attendancePct ?? '—'}{attendancePct !== null ? '%' : ''}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {attendancePct === null
                      ? 'No attendance recorded yet'
                      : attendancePct >= 75
                        ? '✅ Good standing'
                        : '⚠️ Below 75% — at risk'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalSessions} session{totalSessions === 1 ? '' : 's'} tracked in the last 90 days
                  </p>
                  {attendancePct !== null && attendancePct < 75 && (
                    <p className="text-xs text-red-500 mt-1">
                      You need {Math.ceil((0.75 * (totalSessions + 1)) - (attendancePct / 100) * totalSessions)} more session(s) to reach 75%.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account details card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Account Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <span className="font-medium truncate max-w-[60%]">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </span>
                <span className="font-medium">{user.phone || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Preferred language
                </span>
                <span className="font-medium uppercase">{user.preferredLang}</span>
              </div>
              {user.examDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Exam date
                  </span>
                  <span className="font-medium">{new Date(user.examDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/settings" className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Settings</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/class" className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">My Class</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
