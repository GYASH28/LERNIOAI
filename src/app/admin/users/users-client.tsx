'use client'

import { useState, useMemo } from 'react'
import {
  Search, Trash2, X, AlertTriangle, Loader2, Crown, Shield, Users as UsersIcon,
  GraduationCap, Mail, Hash, Flame, Zap, Filter, ChevronDown,
} from 'lucide-react'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  departmentCode: string | null
  semesterNumber: number | null
  division: string | null
  rollNumber: string | null
  xp: number
  streak: number
  createdAt: string
  lastActiveDate: string | null
}

interface Props {
  users: UserRow[]
  currentUserId: string
}

const ROLE_ICONS: Record<string, any> = {
  admin: Shield,
  coordinator: GraduationCap,
  teacher: GraduationCap,
  cr: Crown,
  student: UsersIcon,
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500',
  coordinator: 'bg-violet-500/10 text-violet-500',
  teacher: 'bg-blue-500/10 text-blue-500',
  cr: 'bg-amber-500/10 text-amber-500',
  student: 'bg-emerald-500/10 text-emerald-600',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminUsersClient({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filtered = useMemo(() => {
    let result = users
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.rollNumber?.toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter)
    }
    return result
  }, [users, search, roleFilter])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1 })
    return counts
  }, [users])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to delete user')
      }
      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setSuccess(`Deleted ${deleteTarget.name} (${deleteTarget.email})`)
      setDeleteTarget(null)
      setTimeout(() => setSuccess(''), 5000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {['admin', 'coordinator', 'teacher', 'cr', 'student'].map(role => {
          const Icon = ROLE_ICONS[role] || UsersIcon
          return (
            <div key={role} className="rounded-lg border border-border bg-card p-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-1 text-lg font-bold">{roleCounts[role] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{role}s</p>
            </div>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or roll number..."
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-2 text-xs"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="coordinator">Coordinator</option>
            <option value="teacher">Teacher</option>
            <option value="cr">CR</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Messages */}
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

      {/* User list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <UsersIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">No users found</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const Icon = ROLE_ICONS[u.role] || UsersIcon
            const isSelf = u.id === currentUserId
            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  u.status === 'disabled'
                    ? 'border-border bg-muted/20 opacity-60'
                    : 'border-border bg-card hover:bg-accent/5'
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    {isSelf && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">You</span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {u.role}
                    </span>
                    {u.status === 'disabled' && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-red-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1 truncate"><Mail className="h-2.5 w-2.5" />{u.email}</span>
                    {u.rollNumber && <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{u.rollNumber}</span>}
                    {u.departmentCode && (
                      <span>{u.departmentCode} · Sem {u.semesterNumber} · Div {u.division}</span>
                    )}
                    {u.streak > 0 && <span className="flex items-center gap-0.5 text-orange-500"><Flame className="h-2.5 w-2.5" />{u.streak}</span>}
                    {u.xp > 0 && <span className="flex items-center gap-0.5 text-amber-500"><Zap className="h-2.5 w-2.5" />{u.xp}</span>}
                    <span>Joined {formatDate(u.createdAt)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => {
                    setError('')
                    setDeleteTarget(u)
                  }}
                  disabled={isSelf}
                  className={`shrink-0 rounded-md p-2 transition-colors ${
                    isSelf
                      ? 'cursor-not-allowed text-muted-foreground/30'
                      : 'text-red-500 hover:bg-red-500/10'
                  }`}
                  title={isSelf ? 'You cannot delete yourself' : 'Delete user'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Delete User Account?</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                You are about to <strong className="text-red-500">permanently delete</strong> the following account:
              </p>

              <div className="rounded-lg border border-border bg-background p-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{deleteTarget.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium truncate">{deleteTarget.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium uppercase">{deleteTarget.role}</span>
                </div>
                {deleteTarget.departmentCode && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-medium">{deleteTarget.departmentCode} · Sem {deleteTarget.semesterNumber} · Div {deleteTarget.division}</span>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-600">
                <strong>What gets deleted:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>Account and profile data</li>
                  <li>Class memberships and CR status</li>
                  <li>Attendance records and sessions they took</li>
                  <li>Announcements and timetable slots</li>
                  <li>Bookmarks, notifications, feedback</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
