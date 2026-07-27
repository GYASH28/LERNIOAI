'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Activity, Archive, CheckCircle2, Copy, Download, Flag, MailPlus, Megaphone, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2, UserCheck, UserCog, UserX, Wrench, XCircle } from 'lucide-react'
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
const selectClass = 'h-11 rounded-xl border border-input bg-background px-3 text-sm'

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
    setBusy('load'); setMessage(null)
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
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return users.filter((user) => !term || `${user.name} ${user.email} ${user.role} ${user.departmentCode ?? ''}`.toLowerCase().includes(term)) }, [query, users])

  async function assign() {
    const department = options.departments.find((item) => item.id === departmentId)
    const group = options.classGroups.find((item) => item.id === classGroupId)
    if (!userId) return setMessage('Select a user.')
    if (role === 'teacher' && !subjectId) return setMessage('Select a subject for the Teacher.')
    if (role === 'coordinator' && !department) return setMessage('Select a department for the Coordinator.')
    if (role === 'cr' && !group) return setMessage('Select a class group for the CR.')
    setBusy('assign'); setMessage(null)
    try {
      await json(await fetch('/api/admin/role-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role, institutionId: group?.institutionId || department?.institutionId || null, departmentCode: group?.departmentCode || department?.code || null, classGroupId: role === 'cr' || role === 'teacher' ? classGroupId || null : null, subjectId: role === 'teacher' ? subjectId : null, reason: 'Assigned from CampusMate User Management.' }) }))
      await json(await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, departmentCode: group?.departmentCode || department?.code || null }) }))
      setMessage('Role and academic responsibility assigned successfully.'); setUserId(''); setDepartmentId(''); setClassGroupId(''); setSubjectId(''); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Assignment failed.') }
    finally { setBusy(null) }
  }

  async function toggleStatus(user: UserRow) {
    setBusy(user.id); setMessage(null)
    try { const status = user.status === 'active' ? 'disabled' : 'active'; await json(await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })); setMessage(`${user.name} is now ${status}.`); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Status update failed.') }
    finally { setBusy(null) }
  }

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><ShieldCheck className="h-3.5 w-3.5" />Authority management</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Users and campus roles</h2><p className="mt-3 max-w-3xl text-muted-foreground">Manage Admin → Coordinator/HOD → Teacher → CR → Student and connect elevated users to a real Department, Subject, or Class.</p></section>
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Assign role and responsibility</CardTitle><CardDescription>The protected APIs create the authority scope and update the canonical account role.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectClass}><option value="">Select active user</option>{users.filter((u) => u.status === 'active' && u.role !== 'admin').map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select><select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={selectClass}><option value="teacher">Teacher</option><option value="coordinator">Coordinator / HOD</option><option value="cr">Class Representative</option></select><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectClass}><option value="">Select department</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{role === 'teacher' ? <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectClass}><option value="">Select subject</option>{options.subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : role === 'cr' ? <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} className={selectClass}><option value="">Select class group</option>{options.classGroups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <div />}<Button onClick={() => void assign()} disabled={busy === 'assign'} className="md:col-span-2 xl:col-span-4"><UserCheck className="h-4 w-4" />{busy === 'assign' ? 'Assigning…' : 'Assign role and responsibility'}</Button></CardContent></Card>
    <Card surface="elevated"><CardHeader><CardTitle>People</CardTitle><CardDescription>Live users, canonical roles, active scope, and account status.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="flex gap-3"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="pl-9" /></label><Button variant="outline" onClick={() => void load()} disabled={busy === 'load'}><RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} />Refresh</Button></div><div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">{visible.map((user) => { const scope = assignments.filter((a) => a.user.id === user.id && a.status === 'active' && !a.revokedAt); return <article key={user.id} className="grid gap-4 p-4 hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{user.name}</p><Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>{user.status}</Badge><Badge variant="outline" className="capitalize">{user.role}</Badge></div><p className="text-sm text-muted-foreground">{user.email}</p><p className="mt-1 text-xs text-muted-foreground">{user.departmentCode || 'No department'} · authority v{user.authorityVersion}</p></div><div className="flex flex-wrap gap-2">{scope.length ? scope.map((item) => <Badge key={item.id} variant="outline" className="capitalize">{item.role}{item.departmentCode ? ` · ${item.departmentCode}` : ''}</Badge>) : <span className="text-sm text-muted-foreground">No active elevated scope</span>}</div><Button size="sm" variant="outline" disabled={busy === user.id} onClick={() => void toggleStatus(user)}>{user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{user.status === 'active' ? 'Disable' : 'Restore'}</Button></article> })}</div></CardContent></Card>
  </div>
}

type OpsSection = 'overview' | 'invitations' | 'notices' | 'flags' | 'health'
type OpsData = {
  departments: Array<{ id: string; code: string; name: string; status: string }>
  classGroups: Array<{ id: string; code: string | null; name: string; status: string }>
  invitations: Array<{ id: string; code: string; role: string; status: string; used: boolean; name: string | null; email: string | null; departmentCode: string | null; maxUses: number; useCount: number; expiresAt: string | null }>
  notices: Array<{ id: string; title: string; body: string; status: string }>
  featureFlags: Array<{ id: string; key: string; institutionId: string | null; environment: string; enabled: boolean; rolloutPercent: number | null; description: string | null; cohortJson: string | null }>
  summary: { activeInvitations: number; draftNotices: number; enabledFlags: number; auditEvents: number }
}

export function AdminOperationsControlPanel({ initialSection = 'overview' }: { initialSection?: OpsSection }) {
  const [section, setSection] = useState<OpsSection>(initialSection)
  const [data, setData] = useState<OpsData | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [lastInvite, setLastInvite] = useState('')
  const value = (key: string) => form[key] || ''
  const set = (key: string, next: string) => setForm((current) => ({ ...current, [key]: next }))

  const load = useCallback(async () => {
    setBusy(true)
    try { setData(await json<OpsData>(await fetch('/api/admin/users?controlPlane=1', { cache: 'no-store' }))) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load site operations.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setSection(initialSection); setForm({}) }, [initialSection])

  async function act<T = { item?: { code?: string } }>(action: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('')
    try { const result = await json<T>(await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })); setMessage(success); setForm({}); await load(); return result }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.'); return null }
    finally { setBusy(false) }
  }

  if (!data) return <div className="grid min-h-[60vh] place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-primary" /></div>
  const tabs: Array<[OpsSection, string]> = [['overview', 'Overview'], ['invitations', 'Invite Codes'], ['notices', 'Announcements'], ['flags', 'Feature Flags'], ['health', 'Health']]

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><Wrench className="h-3.5 w-3.5" />Site operations</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Onboarding, communication and runtime control.</h2><p className="mt-3 max-w-3xl text-muted-foreground">Generate elevated-role invitations, publish announcements and control feature rollout with an audit trail.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button><Button asChild variant="outline"><a href="/api/admin/users?controlPlane=1&download=1"><Download className="h-4 w-4" />Export</a></Button><Button variant="outline" onClick={() => void act('invite.expire', {}, 'Expired invites marked.')}><Archive className="h-4 w-4" />Expire old</Button></div></div></section>
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    {lastInvite ? <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"><code className="text-lg font-black">{lastInvite}</code><Button variant="outline" onClick={() => void navigator.clipboard.writeText(lastInvite)}><Copy className="h-4 w-4" />Copy</Button></div> : null}
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => { setSection(key); setForm({}) }} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>)}</div>
    {section === 'overview' ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Active invitations', data.summary.activeInvitations], ['Draft announcements', data.summary.draftNotices], ['Enabled flags', data.summary.enabledFlags], ['Audit events', data.summary.auditEvents]].map(([label, count]) => <Card key={String(label)} surface="panel"><CardHeader><CardDescription>{String(label)}</CardDescription><CardTitle className="text-3xl font-black">{String(count)}</CardTitle></CardHeader></Card>)}</div> : null}
    {section === 'invitations' ? <OpsCard icon={MailPlus} title="Invite codes" description="CR, Teacher, Coordinator, Reviewer, Moderator and Admin invitations are supported."><OpsForm onSubmit={async () => { const result = await act<{ item?: { code?: string } }>('invite.create', { role: value('role') || 'teacher', email: value('email') || null, departmentCode: value('departmentCode') || null, classGroupId: value('classGroupId') || null, subjectIds: value('subjectIds').split(',').map((item) => item.trim()).filter(Boolean), maxUses: Number(value('maxUses') || 1), expiresInDays: Number(value('expiresInDays') || 14), confirmation: value('confirmation') }, 'Invite created.'); if (result?.item?.code) setLastInvite(result.item.code) }}><select className={selectClass} value={value('role') || 'teacher'} onChange={(e) => set('role', e.target.value)}><option value="cr">CR</option><option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="reviewer">Reviewer</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select><Input type="email" placeholder="Restricted email (optional)" value={value('email')} onChange={(e) => set('email', e.target.value)} /><select className={selectClass} value={value('departmentCode')} onChange={(e) => set('departmentCode', e.target.value)}><option value="">Department scope</option>{data.departments.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.code}>{item.code}</option>)}</select><select className={selectClass} value={value('classGroupId')} onChange={(e) => set('classGroupId', e.target.value)}><option value="">Class scope</option>{data.classGroups.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.code || item.name}</option>)}</select><Input placeholder="Subject IDs, comma separated" value={value('subjectIds')} onChange={(e) => set('subjectIds', e.target.value)} />{value('role') === 'admin' ? <Input placeholder="Type CREATE ADMIN INVITE" value={value('confirmation')} onChange={(e) => set('confirmation', e.target.value)} /> : null}<Submit busy={busy} label="Generate" /></OpsForm><OpsList>{data.invitations.map((item) => <OpsRow key={item.id} title={`${item.code} · ${item.role}`} detail={`${item.email || item.name || 'General'} · ${item.departmentCode || 'No department'} · ${item.useCount}/${item.maxUses} uses`} status={item.status} actions={<><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(item.code)}><Copy className="h-4 w-4" /></Button>{item.status === 'active' ? <Button size="sm" variant="outline" onClick={() => void act('invite.revoke', { id: item.id }, 'Invite revoked.')}>Revoke</Button> : <Button size="sm" variant="outline" onClick={() => void act('invite.restore', { id: item.id }, 'Invite restored.')}><RotateCcw className="h-4 w-4" /></Button>}{!item.used && item.useCount === 0 ? <Button size="sm" variant="destructive" onClick={() => { if (window.prompt('Type DELETE INVITE') === 'DELETE INVITE') void act('invite.delete', { id: item.id, confirmation: 'DELETE INVITE' }, 'Invite deleted.') }}><Trash2 className="h-4 w-4" /></Button> : null}</>} />)}</OpsList></OpsCard> : null}
    {section === 'notices' ? <OpsCard icon={Megaphone} title="Announcements" description="Draft, publish, archive and remove campus notices."><OpsForm onSubmit={() => act('notice.create', { title: value('title'), body: value('body'), status: value('status') || 'draft', audience: { role: value('audienceRole') || null } }, 'Announcement created.')}><Input placeholder="Title" value={value('title')} onChange={(e) => set('title', e.target.value)} required /><Input placeholder="Message" value={value('body')} onChange={(e) => set('body', e.target.value)} required /><select className={selectClass} value={value('status') || 'draft'} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Publish now</option></select><select className={selectClass} value={value('audienceRole')} onChange={(e) => set('audienceRole', e.target.value)}><option value="">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="coordinator">Coordinators</option></select><Submit busy={busy} /></OpsForm><OpsList>{data.notices.map((item) => <OpsRow key={item.id} title={item.title} detail={item.body.slice(0, 140)} status={item.status} actions={<>{item.status === 'published' ? <Button size="sm" variant="outline" onClick={() => void act('notice.archive', { id: item.id }, 'Notice archived.')}>Archive</Button> : <Button size="sm" variant="outline" onClick={() => void act('notice.publish', { id: item.id }, 'Notice published.')}>Publish</Button>}{item.status !== 'published' ? <Button size="sm" variant="destructive" onClick={() => { if (window.prompt('Type DELETE NOTICE') === 'DELETE NOTICE') void act('notice.delete', { id: item.id, confirmation: 'DELETE NOTICE' }, 'Notice deleted.') }}><Trash2 className="h-4 w-4" /></Button> : null}</>} />)}</OpsList></OpsCard> : null}
    {section === 'flags' ? <OpsCard icon={Flag} title="Feature flags" description="Turn capabilities on or off without redeploying."><OpsForm onSubmit={() => act('flag.upsert', { key: value('key'), environment: value('environment') || 'all', enabled: value('enabled') !== 'false', rolloutPercent: Number(value('rolloutPercent') || 100), description: value('description') || null }, 'Feature flag saved.')}><Input placeholder="flag.key" value={value('key')} onChange={(e) => set('key', e.target.value)} required /><select className={selectClass} value={value('environment') || 'all'} onChange={(e) => set('environment', e.target.value)}><option value="all">All environments</option><option value="preview">Preview</option><option value="production">Production</option></select><Input type="number" min="0" max="100" placeholder="Rollout %" value={value('rolloutPercent')} onChange={(e) => set('rolloutPercent', e.target.value)} /><Input placeholder="Description" value={value('description')} onChange={(e) => set('description', e.target.value)} /><Submit busy={busy} /></OpsForm><OpsList>{data.featureFlags.map((item) => <OpsRow key={item.id} title={item.key} detail={`${item.environment} · ${item.rolloutPercent ?? 100}% · ${item.description || 'No description'}`} status={item.enabled ? 'enabled' : 'disabled'} actions={<><Button size="sm" variant="outline" onClick={() => void act('flag.upsert', { id: item.id, key: item.key, institutionId: item.institutionId, environment: item.environment, enabled: !item.enabled, rolloutPercent: item.rolloutPercent, description: item.description, cohortJson: item.cohortJson }, `Flag ${item.enabled ? 'disabled' : 'enabled'}.`)}>{item.enabled ? 'Disable' : 'Enable'}</Button><Button size="sm" variant="destructive" onClick={() => { if (window.prompt('Type DELETE FLAG') === 'DELETE FLAG') void act('flag.delete', { id: item.id, confirmation: 'DELETE FLAG' }, 'Flag deleted.') }}><Trash2 className="h-4 w-4" /></Button></>} />)}</OpsList></OpsCard> : null}
    {section === 'health' ? <DeploymentHealthPanel /> : null}
  </div>
}

function OpsCard({ icon: Icon, title, description, children }: { icon: typeof MailPlus; title: string; description: string; children: ReactNode }) { return <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-5">{children}</CardContent></Card> }
function OpsForm({ onSubmit, children }: { onSubmit: () => void | Promise<unknown>; children: ReactNode }) { return <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSubmit() }}>{children}</form> }
function Submit({ busy, label = 'Create' }: { busy: boolean; label?: string }) { return <Button type="submit" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Working…' : label}</Button> }
function OpsList({ children }: { children: ReactNode }) { return <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">{children}</div> }
function OpsRow({ title, detail, status, actions }: { title: string; detail: string; status: string; actions: ReactNode }) { return <article className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{title}</p><Badge variant={['active', 'published', 'enabled'].includes(status) ? 'secondary' : 'destructive'}>{status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div><div className="flex flex-wrap gap-2">{actions}</div></article> }

type HealthService = {
  configured: boolean
  reason?: string | null
  affects: string
}
type HealthData = {
  services: {
    codeRunner: HealthService
    email: HealthService
    storage: HealthService
    groq: HealthService
    googleOauth: HealthService
  }
}

const HEALTH_SERVICE_LABEL: Record<keyof HealthData['services'], string> = {
  codeRunner: 'Code Runner',
  email: 'Email (Resend)',
  storage: 'Storage',
  groq: 'AI Provider (Groq)',
  googleOauth: 'Google OAuth',
}

/**
 * Deployment health panel — surfaces the configured / not-configured state
 * of every optional-infrastructure system the deployment depends on. Reads
 * directly from `/api/admin/health`, which is the single server-side source
 * of truth (it calls the same `getCodeRunnerConfig()`, `isEmailConfigured()`,
 * `isStorageConfigured()`, and env-var checks the runtime code uses).
 */
function DeploymentHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try { setData(await json<HealthData>(await fetch('/api/admin/health', { cache: 'no-store' }))) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load deployment health.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (busy && !data) return <div className="grid min-h-[40vh] place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-primary" /></div>
  if (error && !data) return <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Deployment health</CardTitle></CardHeader><CardContent><p className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Retry</Button></CardContent></Card>
  if (!data) return null

  const entries = Object.entries(data.services) as Array<[keyof HealthData['services'], HealthService]>
  const configuredCount = entries.filter(([, service]) => service.configured).length

  return <Card surface="elevated"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Deployment health</CardTitle><CardDescription className="mt-1">Live configuration status of optional infrastructure. Read directly from server-side environment variables — this is the same source of truth the runtime code uses.</CardDescription></div><div className="flex items-center gap-2"><Badge variant={configuredCount === entries.length ? 'secondary' : 'destructive'}>{configuredCount}/{entries.length} configured</Badge><Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div></div></CardHeader><CardContent className="grid gap-3">{entries.map(([key, service]) => <HealthServiceRow key={key} name={HEALTH_SERVICE_LABEL[key]} service={service} />)}</CardContent></Card>
}

function HealthServiceRow({ name, service }: { name: string; service: HealthService }) {
  return <article className="grid gap-2 rounded-2xl border border-border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2">{service.configured ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}<p className="font-black">{name}</p><Badge variant={service.configured ? 'secondary' : 'destructive'}>{service.configured ? 'Configured' : 'Not configured'}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{service.affects}</p>{service.reason ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Reason: {service.reason}</p> : null}</div></article>
}
