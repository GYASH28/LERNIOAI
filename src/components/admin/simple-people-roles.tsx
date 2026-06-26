'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserCheck, UserCog, UserX, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type UserRow = { id: string; email: string; name: string; role: string; status: string; departmentCode: string | null }
type Option = { id: string; label: string }
type Options = {
  departments: Array<Option & { code: string; institutionId: string }>
  subjects: Array<Option & { code: string }>
  classGroups: Array<Option & { institutionId: string; departmentCode: string | null }>
}

const selectClass = 'h-11 rounded-xl border border-input bg-background px-3 text-sm'

async function read<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) throw new Error(payload?.error?.message || 'Request failed.')
  return payload.data
}

export function SimplePeopleRoles() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [options, setOptions] = useState<Options>({ departments: [], subjects: [], classGroups: [] })
  const [query, setQuery] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'teacher' | 'coordinator' | 'cr'>('teacher')
  const [departmentId, setDepartmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [people, available] = await Promise.all([
        fetch('/api/admin/users?page=1&pageSize=50', { cache: 'no-store' }).then((response) => read<{ users: UserRow[] }>(response)),
        fetch('/api/admin/access/options', { cache: 'no-store' }).then((response) => read<Options>(response)),
      ])
      setUsers(people.users)
      setOptions(available)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load people.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    return users.filter((user) => !term || `${user.name} ${user.email} ${user.role} ${user.departmentCode || ''}`.toLowerCase().includes(term))
  }, [query, users])

  async function assign() {
    const department = options.departments.find((item) => item.id === departmentId)
    const classGroup = options.classGroups.find((item) => item.id === classGroupId)
    if (!userId) return setMessage('Choose a person.')
    if (role === 'teacher' && (!department || !subjectId)) return setMessage('Choose the teacher’s department and subject.')
    if (role === 'coordinator' && !department) return setMessage('Choose the coordinator’s department.')
    if (role === 'cr' && !classGroup) return setMessage('Choose the CR’s class.')

    setBusy(true)
    setMessage('')
    try {
      await read(await fetch('/api/admin/role-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          institutionId: classGroup?.institutionId || department?.institutionId || null,
          departmentCode: classGroup?.departmentCode || department?.code || null,
          classGroupId: role === 'cr' ? classGroupId : null,
          subjectId: role === 'teacher' ? subjectId : null,
          reason: 'Assigned from People & Roles.',
        }),
      }))
      await read(await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, departmentCode: classGroup?.departmentCode || department?.code || null }),
      }))
      setMessage('Role assigned successfully.')
      setUserId(''); setDepartmentId(''); setSubjectId(''); setClassGroupId('')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not assign this role.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(user: UserRow) {
    setBusy(true)
    setMessage('')
    try {
      const status = user.status === 'active' ? 'disabled' : 'active'
      await read(await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }))
      setMessage(`${user.name} is now ${status}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this account.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><Users className="h-3.5 w-3.5" />People & Roles</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Assign roles in a few steps</h2><p className="mt-3 text-muted-foreground">Choose a person, choose their role, and select where they belong.</p></div><Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div></section>

    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}

    <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Assign a role</CardTitle><CardDescription>The account will immediately receive the selected workspace.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select className={selectClass} value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Choose person</option>{users.filter((user) => user.status === 'active' && user.role !== 'admin').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select><select className={selectClass} value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="teacher">Teacher</option><option value="coordinator">Coordinator / HOD</option><option value="cr">Class Representative</option></select>{role !== 'cr' ? <select className={selectClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">Choose department</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <select className={selectClass} value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)}><option value="">Choose class</option>{options.classGroups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}{role === 'teacher' ? <select className={selectClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Choose subject</option>{options.subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : null}<Button onClick={() => void assign()} disabled={busy} className="md:col-span-2 xl:col-span-4"><UserCheck className="h-4 w-4" />{busy ? 'Saving…' : 'Assign role'}</Button></CardContent></Card>

    <Card surface="elevated"><CardHeader><CardTitle>People</CardTitle><CardDescription>Search users and manage account access.</CardDescription></CardHeader><CardContent className="grid gap-4"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or role" className="pl-9" /></label><div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">{visibleUsers.map((user) => <article key={user.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{user.name}</p><Badge variant="outline" className="capitalize">{user.role}</Badge><Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>{user.status}</Badge></div><p className="text-sm text-muted-foreground">{user.email}{user.departmentCode ? ` · ${user.departmentCode}` : ''}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus(user)}>{user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{user.status === 'active' ? 'Disable' : 'Restore'}</Button></article>)}</div></CardContent></Card>
  </div>
}
