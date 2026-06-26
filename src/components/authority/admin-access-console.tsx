'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const ROLE_OPTIONS = ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'] as const

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

type ApiEnvelope<T> = {
  ok: boolean
  data?: T
  error?: { message?: string }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) {
    throw new Error(payload?.error?.message || `Request failed with status ${response.status}.`)
  }
  return payload.data
}

export function AdminAccessConsole() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [query, setQuery] = useState('')
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [userData, requestData] = await Promise.all([
        fetch('/api/admin/users?page=1&pageSize=50', { cache: 'no-store' }).then((response) =>
          readJson<{ users: AdminUser[] }>(response),
        ),
        fetch('/api/admin/role-requests', { cache: 'no-store' }).then((response) =>
          readJson<{ requests: RoleRequest[] }>(response),
        ),
      ])
      setUsers(userData.users)
      setRequests(requestData.requests)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load admin access data.')
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
      const body: Record<string, unknown> = {
        status,
        reviewNote: status === 'approved' ? 'Approved from the Lernio Admin access console.' : 'Rejected from the Lernio Admin access console.',
      }
      if (departmentCode) body.departmentCode = departmentCode

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
              Manage account status and roles, and review pending authority requests. All changes are enforced server-side and audited.
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
              Approvals require a valid department, subject, class, or institution scope. Enter a department code when the request does not already contain one.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : null}
            {!loading && requests.filter((request) => request.status === 'pending').length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending role requests.</p>
            ) : null}
            {requests
              .filter((request) => request.status === 'pending')
              .map((request) => (
                <div key={request.id} className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.user.name}</p>
                      <Badge variant="secondary" className="capitalize">{request.requestedRole}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{request.user.email}</p>
                    <p className="mt-2 text-sm">{request.reason || 'No reason supplied.'}</p>
                  </div>
                  <Input
                    aria-label={`Department scope for ${request.user.name}`}
                    placeholder="Department code, e.g. CIOT"
                    value={scopeDrafts[request.id] ?? request.departmentCode ?? ''}
                    onChange={(event) => setScopeDrafts((current) => ({ ...current, [request.id]: event.target.value.toUpperCase() }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void reviewRequest(request, 'approved')} disabled={busyId === request.id}>
                      <UserCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void reviewRequest(request, 'rejected')} disabled={busyId === request.id}>
                      <UserX className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Change a user’s primary role or disable/restore their account. The final active Admin is protected.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, email, role, or department" className="pl-9" />
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
                    aria-label={`Role for ${user.name}`}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={(event) => void patchUser(user.id, { role: event.target.value }, `${user.name}'s role was updated.`)}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
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
