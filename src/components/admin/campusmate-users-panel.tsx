'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck, UserCheck, UserCog, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type UserRow = { id: string; email: string; name: string; role: string; status: string; departmentCode: string | null; semesterNumber: number | null; division: string | null; authorityVersion: number }
type Assignment = { id: string; role: string; status: string; departmentCode: string | null; classGroupId: string | null; subjectId: string | null; revokedAt: string | null; user: { id: string; name: string; email: string } }
type BasicOption = { id: string; label: string }
type Options = {
  institutions: BasicOption[]
  departments: Array<BasicOption & { code: string; institutionId: string }>
  subjects: Array<BasicOption & { code: string; schemeId: string }>
  classGroups: Array<BasicOption & { institutionId: string; departmentId: string | null; departmentCode: string | null }>
}
type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } }

const EMPTY_OPTIONS: Options = { institutions: [], departments: [], subjects: [], classGroups: [] }

async function json<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) throw new Error(payload?.error?.message || 'Request failed.')
  return payload.data
}

export function CampusmateUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [options, setOptions] = useState<Options>(EMPTY_OPTIONS)
  const [query, setQuery] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'teacher' | 'coordinator' | 'cr'>('teacher')
  const [departmentId, setDepartmentId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy('load')
    setMessage(null)
    try {
      const [u, a, o] = await Promise.all([
        fetch('/api/admin/users?page=1&pageSize=50', { cache: 'no-store' }).then((r) => json<{ users: UserRow[] }>(r)),
        fetch('/api/admin/role-assignments', { cache: 'no-store' }).then((r) => json<{ assignments: Assignment[] }>(r)),
        fetch('/api/admin/access/options', { cache: 'no-store' }).then((r) => json<Options>(r)),
      ])
      setUsers(u.users); setAssignments(a.assignments); setOptions(o)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load users.') }
    finally { setBusy(null) }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return users.filter((user) => !term || `${user.name} ${user.email} ${user.role} ${user.departmentCode ?? ''}`.toLowerCase().includes(term))
  }, [query, users])

  async function assign() {
    const department = options.departments.find((item) => item.id === departmentId)
    const group = options.classGroups.find((item) => item.id === classGroupId)
    if (!userId) return setMessage('Select a user.')
    if (role === 'teacher' && !subjectId) return setMessage('Select a subject for the Teacher.')
    if (role === 'coordinator' && !department) return setMessage('Select a department for the Coordinator.')
    if (role === 'cr' && !group) return setMessage('Select a class group for the CR.')
    setBusy('assign'); setMessage(null)
    try {
      await json(await fetch('/api/admin/role-assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, role,
          institutionId: group?.institutionId || department?.institutionId || null,
          departmentCode: group?.departmentCode || department?.code || null,
          classGroupId: role === 'cr' || role === 'teacher' ? classGroupId || null : null,
          subjectId: role === 'teacher' ? subjectId : null,
          reason: 'Assigned from CampusMate User Management.',
        }),
      }))
      await json(await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, departmentCode: group?.departmentCode || department?.code || null }),
      }))
      setMessage('Role and academic responsibility assigned successfully.')
      setUserId(''); setDepartmentId(''); setClassGroupId(''); setSubjectId('')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Assignment failed.') }
    finally { setBusy(null) }
  }

  async function toggleStatus(user: UserRow) {
    setBusy(user.id); setMessage(null)
    try {
      const status = user.status === 'active' ? 'disabled' : 'active'
      await json(await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      }))
      setMessage(`${user.name} is now ${status}.`); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status update failed.') }
    finally { setBusy(null) }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><ShieldCheck className="h-3.5 w-3.5" />Authority management</div>
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Users and campus roles</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Manage Admin → Coordinator/HOD → Teacher → CR → Student and connect elevated users to a real Department, Subject, or Class.</p>
      </section>

      {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}

      <Card surface="elevated">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Assign role and responsibility</CardTitle><CardDescription>The existing protected APIs create the authority scope and then update the canonical account role.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Select active user</option>{users.filter((u) => u.status === 'active' && u.role !== 'admin').map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="teacher">Teacher</option><option value="coordinator">Coordinator / HOD</option><option value="cr">Class Representative</option></select>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Select department</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {role === 'teacher' ? <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Select subject</option>{options.subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : role === 'cr' ? <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="">Select class group</option>{options.classGroups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <div />}
          <Button onClick={() => void assign()} disabled={busy === 'assign'} className="md:col-span-2 xl:col-span-4"><UserCheck className="h-4 w-4" />{busy === 'assign' ? 'Assigning…' : 'Assign role and responsibility'}</Button>
        </CardContent>
      </Card>

      <Card surface="elevated">
        <CardHeader><CardTitle>People</CardTitle><CardDescription>Live users, canonical roles, active scope, and account status.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex gap-3"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="pl-9" /></label><Button variant="outline" onClick={() => void load()} disabled={busy === 'load'}><RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} />Refresh</Button></div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {visible.map((user) => {
              const scope = assignments.filter((a) => a.user.id === user.id && a.status === 'active' && !a.revokedAt)
              return <article key={user.id} className="grid gap-4 p-4 hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{user.name}</p><Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>{user.status}</Badge><Badge variant="outline" className="capitalize">{user.role}</Badge></div><p className="text-sm text-muted-foreground">{user.email}</p><p className="mt-1 text-xs text-muted-foreground">{user.departmentCode || 'No department'} · authority v{user.authorityVersion}</p></div><div className="flex flex-wrap gap-2">{scope.length ? scope.map((item) => <Badge key={item.id} variant="outline" className="capitalize">{item.role}{item.departmentCode ? ` · ${item.departmentCode}` : ''}</Badge>) : <span className="text-sm text-muted-foreground">No active elevated scope</span>}</div><Button size="sm" variant="outline" disabled={busy === user.id} onClick={() => void toggleStatus(user)}>{user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{user.status === 'active' ? 'Disable' : 'Restore'}</Button></article>
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
