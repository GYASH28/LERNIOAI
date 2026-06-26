'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const PRIMARY_ROLE_OPTIONS = ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'] as const
const ASSIGNABLE_ROLE_OPTIONS = ['cr', 'teacher', 'coordinator', 'moderator', 'reviewer'] as const

type AdminUser = {
  id: string
  email: string
  name: string
  role: string
  status: string
  departmentCode: string | null
  semesterNumber: number | null
  division: string | null
  profileComplete: boolean
  authorityVersion: number
}

type RoleRequest = {
  id: string
  requestedRole: string
  reason: string | null
  departmentCode: string | null
  subjectIds: string | null
  status: string
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

type RoleAssignment = {
  id: string
  role: string
  status: string
  institutionId: string | null
  departmentCode: string | null
  classGroupId: string | null
  subjectId: string | null
  startsAt: string
  expiresAt: string | null
  revokedAt: string | null
  user: { id: string; name: string; email: string }
}

type AssignmentDraft = {
  userId: string
  role: string
  institutionId: string
  departmentCode: string
  classGroupId: string
  subjectId: string
  reason: string
}

type ApiEnvelope<T> = {
  ok: boolean
  data?: T
  error?: { message?: string }
}

const EMPTY_ASSIGNMENT: AssignmentDraft = {
  userId: '',
  role: 'teacher',
  institutionId: '',
  departmentCode: '',
  classGroupId: '',
  subjectId: '',
  reason: '',
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) {
    throw new Error(payload?.error?.message || `Request failed with status ${response.status}.`)
  }
  return payload.data
}

function assignmentScope(assignment: RoleAssignment) {
  if (assignment.subjectId) return `Subject ${assignment.subjectId}`
  if (assignment.classGroupId) return `Class ${assignment.classGroupId}`
  if (assignment.departmentCode) return `Department ${assignment.departmentCode}`
  if (assignment.institutionId) return `Institution ${assignment.institutionId}`
  return 'Invalid empty scope'
}

function storedSubjectText(subjectIds: string | null) {
  if (!subjectIds) return ''
  try {
    const parsed = JSON.parse(subjectIds) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').join(', ')
      : ''
  } catch {
    return ''
  }
}

function commaSeparatedIds(value: string) {
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)))
}

export function AdminAccessConsole() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>(EMPTY_ASSIGNMENT)
  const [query, setQuery] = useState('')
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({})
  const [subjectDrafts, setSubjectDrafts] = useState<Record<string, string>>({})
  const [classGroupDrafts, setClassGroupDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [userData, requestData, assignmentData] = await Promise.all([
        fetch('/api/admin/users?page=1&pageSize=50', { cache: 'no-store' }).then((response) =>
          readJson<{ users: AdminUser[] }>(response),
        ),
        fetch('/api/admin/role-requests', { cache: 'no-store' }).then((response) =>
          readJson<{ requests: RoleRequest[] }>(response),
        ),
        fetch('/api/admin/role-assignments', { cache: 'no-store' }).then((response) =>
          readJson<{ assignments: RoleAssignment[] }>(response),
        ),
      ])
      setUsers(userData.users)
      setRequests(requestData.requests)
      setAssignments(assignmentData.assignments)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load Admin access data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role} ${user.departmentCode ?? ''}`.toLowerCase().includes(term),
    )
  }, [query, users])

  const pendingRequests = requests.filter((request) => request.status === 'pending')
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active' && !assignment.revokedAt)

  async function patchUser(userId: string, updates: Record<string, unknown>, successMessage: string) {
    setBusyId(userId)
    setError(null)
    setNotice(null)
    try {
      await readJson<{ user: AdminUser }>(
        await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
      )
      setNotice(successMessage)
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'User update failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function reviewRequest(request: RoleRequest, status: 'approved' | 'rejected') {
    setBusyId(request.id)
    setError(null)
    setNotice(null)
    try {
      const departmentCode = (scopeDrafts[request.id] ?? request.departmentCode ?? '').trim()
      const subjectText = subjectDrafts[request.id] ?? storedSubjectText(request.subjectIds)
      const assignedSubjects = commaSeparatedIds(subjectText)
      const classGroupId = (classGroupDrafts[request.id] ?? '').trim()
      const body: Record<string, unknown> = {
        status,
        reviewNote: status === 'approved'
          ? 'Approved from the Lernio Admin access console.'
          : 'Rejected from the Lernio Admin access console.',
      }
      if (departmentCode) body.departmentCode = departmentCode
      if (assignedSubjects.length) body.assignedSubjects = assignedSubjects
      if (classGroupId) body.classGroupId = classGroupId

      await readJson<{ status: string }>(
        await fetch(`/api/roles/request/${request.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      )
      setNotice(`${request.user.name}'s ${request.requestedRole} request was ${status}.`)
      await load()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Role request update failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyId('create-assignment')
    setError(null)
    setNotice(null)
    try {
      const payload = {
        userId: assignmentDraft.userId,
        role: assignmentDraft.role,
        institutionId: assignmentDraft.institutionId.trim() || null,
        departmentCode: assignmentDraft.departmentCode.trim().toUpperCase() || null,
        classGroupId: assignmentDraft.classGroupId.trim() || null,
        subjectId: assignmentDraft.subjectId.trim() || null,
        reason: assignmentDraft.reason.trim() || undefined,
      }
      await readJson<{ assignment: { id: string } }>(
        await fetch('/api/admin/role-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      )
      setNotice('Scoped role assignment created.')
      setAssignmentDraft(EMPTY_ASSIGNMENT)
      await load()
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Role assignment failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function revokeAssignment(assignment: RoleAssignment) {
    setBusyId(assignment.id)
    setError(null)
    setNotice(null)
    try {
      await readJson<{ assignment: RoleAssignment }>(
        await fetch(`/api/admin/role-assignments/${assignment.id}`, { method: 'DELETE' }),
      )
      setNotice(`${assignment.role} assignment revoked for ${assignment.user.name}.`)
      await load()
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Could not revoke assignment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin authority
            </div>
            <h1 className="text-3xl font-black tracking-normal">Access control</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Manage account status, scoped assignments, and pending authority requests. Server authorization and audit logging remain the source of truth.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            {notice}
          </div>
        ) : null}

        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Pending role requests</CardTitle>
            <CardDescription>
              Approvals are role-aware: CR needs a class group, Teacher needs subjects, Coordinator needs a department, and Reviewer/Moderator need an appropriate academic or institution scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : null}
            {!loading && pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending role requests.</p>
            ) : null}
            {pendingRequests.map((request) => {
              const needsSubjects = request.requestedRole === 'teacher' || request.requestedRole === 'reviewer'
              const needsClassGroup = request.requestedRole === 'cr'
              return (
                <div key={request.id} className="grid gap-4 rounded-xl border border-border p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.user.name}</p>
                      <Badge variant="secondary" className="capitalize">{request.requestedRole}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{request.user.email}</p>
                    <p className="mt-2 text-sm">{request.reason || 'No reason supplied.'}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      aria-label={`Department scope for ${request.user.name}`}
                      placeholder="Department code, e.g. CIOT"
                      value={scopeDrafts[request.id] ?? request.departmentCode ?? ''}
                      onChange={(event) => setScopeDrafts((current) => ({
                        ...current,
                        [request.id]: event.target.value.toUpperCase(),
                      }))}
                    />
                    {needsSubjects ? (
                      <Input
                        aria-label={`Subject scopes for ${request.user.name}`}
                        placeholder="Subject IDs, comma separated"
                        value={subjectDrafts[request.id] ?? storedSubjectText(request.subjectIds)}
                        onChange={(event) => setSubjectDrafts((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))}
                      />
                    ) : <div />}
                    {needsClassGroup ? (
                      <Input
                        aria-label={`Class group for ${request.user.name}`}
                        placeholder="Class-group ID"
                        value={classGroupDrafts[request.id] ?? ''}
                        onChange={(event) => setClassGroupDrafts((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))}
                      />
                    ) : <div />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void reviewRequest(request, 'approved')} disabled={busyId === request.id}>
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void reviewRequest(request, 'rejected')} disabled={busyId === request.id}>
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Scoped role assignments</CardTitle>
            <CardDescription>
              Create normalized authority with at least one real scope. Use a department code for HOD-level access, a subject ID for Teacher/Reviewer access, a class-group ID for CR access, or an institution ID for Moderator access.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form onSubmit={createAssignment} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                aria-label="Assignment user"
                required
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={assignmentDraft.userId}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, userId: event.target.value }))}
              >
                <option value="">Select user</option>
                {users.filter((user) => user.status === 'active').map((user) => (
                  <option key={user.id} value={user.id}>{user.name} — {user.email}</option>
                ))}
              </select>
              <select
                aria-label="Assignment role"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={assignmentDraft.role}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, role: event.target.value }))}
              >
                {ASSIGNABLE_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <Input
                placeholder="Department code"
                aria-label="Department code"
                value={assignmentDraft.departmentCode}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, departmentCode: event.target.value.toUpperCase() }))}
              />
              <Input
                placeholder="Subject ID"
                aria-label="Subject ID"
                value={assignmentDraft.subjectId}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, subjectId: event.target.value }))}
              />
              <Input
                placeholder="Class-group ID"
                aria-label="Class-group ID"
                value={assignmentDraft.classGroupId}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, classGroupId: event.target.value }))}
              />
              <Input
                placeholder="Institution ID"
                aria-label="Institution ID"
                value={assignmentDraft.institutionId}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, institutionId: event.target.value }))}
              />
              <Input
                placeholder="Reason or internal note"
                aria-label="Assignment reason"
                value={assignmentDraft.reason}
                onChange={(event) => setAssignmentDraft((current) => ({ ...current, reason: event.target.value }))}
                className="xl:col-span-2"
              />
              <Button type="submit" disabled={busyId === 'create-assignment'} className="md:col-span-2 xl:col-span-4">
                <Plus className="h-4 w-4" />
                {busyId === 'create-assignment' ? 'Creating assignment…' : 'Create scoped assignment'}
              </Button>
            </form>

            <div className="grid gap-3">
              {!loading && activeAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active normalized role assignments.</p>
              ) : null}
              {activeAssignments.map((assignment) => (
                <div key={assignment.id} className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{assignment.user.name}</p>
                      <Badge variant="secondary" className="capitalize">{assignment.role}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{assignment.user.email}</p>
                  </div>
                  <p className="text-sm font-medium text-primary">{assignmentScope(assignment)}</p>
                  <Button variant="outline" size="sm" disabled={busyId === assignment.id} onClick={() => void revokeAssignment(assignment)}>
                    <Trash2 className="h-4 w-4" /> Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Change an account’s primary role or disable/restore it. Use scoped assignments above for operational authority. The final active Admin is protected.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users, email, role, or department"
                className="pl-9"
              />
            </label>

            <div className="grid gap-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[minmax(0,1fr)_180px_160px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{user.name}</p>
                      <Badge variant="secondary" className="capitalize">{user.status}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.departmentCode || 'No department'} · authority v{user.authorityVersion}
                    </p>
                  </div>

                  <select
                    aria-label={`Primary role for ${user.name}`}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={(event) => void patchUser(
                      user.id,
                      { role: event.target.value },
                      `${user.name}'s primary role was updated.`,
                    )}
                  >
                    {PRIMARY_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>

                  <Button
                    variant="outline"
                    disabled={busyId === user.id}
                    onClick={() => void patchUser(
                      user.id,
                      { status: user.status === 'active' ? 'disabled' : 'active' },
                      `${user.name} was ${user.status === 'active' ? 'disabled' : 'restored'}.`,
                    )}
                  >
                    {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {user.status === 'active' ? 'Disable' : 'Restore'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
