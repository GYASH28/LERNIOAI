'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, Copy, MailPlus, Megaphone, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Section = 'invitations' | 'notices'
type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type Data = {
  departments: Array<{ id: string; code: string; name: string; status: string }>
  classGroups: Array<{ id: string; code: string | null; name: string; status: string }>
  invitations: Array<{ id: string; code: string; role: string; status: string; used: boolean; name: string | null; email: string | null; departmentCode: string | null; maxUses: number; useCount: number }>
  notices: Array<{ id: string; title: string; body: string; status: string }>
}

const selectClass = 'h-11 rounded-xl border border-input bg-background px-3 text-sm'

async function read<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) throw new Error(payload?.error?.message || 'Request failed.')
  return payload.data
}

export function SimpleSiteOperations({ initialSection = 'invitations' }: { initialSection?: Section }) {
  const [section, setSection] = useState<Section>(initialSection)
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [newCode, setNewCode] = useState('')
  const value = (key: string) => form[key] || ''
  const set = (key: string, next: string) => setForm((current) => ({ ...current, [key]: next }))

  const load = useCallback(async () => {
    setBusy(true)
    try { setData(await read<Data>(await fetch('/api/admin/users?controlPlane=1', { cache: 'no-store' }))) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load this page.') }
    finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setSection(initialSection); setForm({}) }, [initialSection])

  async function act<T = { item?: { code?: string } }>(action: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('')
    try {
      const result = await read<T>(await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) }))
      setMessage(success); setForm({}); await load(); return result
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.'); return null }
    finally { setBusy(false) }
  }

  async function createInvite() {
    const role = value('role') || 'teacher'
    if (role === 'admin' && !window.confirm('Create a one-time Admin invite code?')) return
    const result = await act<{ item?: { code?: string } }>('invite.create', {
      role,
      email: value('email') || null,
      departmentCode: value('departmentCode') || null,
      classGroupId: value('classGroupId') || null,
      subjectIds: [],
      maxUses: 1,
      expiresInDays: 14,
      confirmation: role === 'admin' ? 'CREATE ADMIN INVITE' : undefined,
    }, 'Invite code created.')
    if (result?.item?.code) setNewCode(result.item.code)
  }

  if (!data) return <div className="grid min-h-[60vh] place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-primary" /></div>
  const role = value('role') || 'teacher'
  const needsDepartment = ['teacher', 'coordinator', 'reviewer', 'moderator'].includes(role)
  const needsClass = role === 'cr'

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">Admin Tools</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Invite codes and announcements</h2><p className="mt-3 text-muted-foreground">Choose a role or write a notice. Lernio handles the technical details.</p></div><Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div></section>
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    {newCode ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Ready to share</p><code className="text-xl font-black">{newCode}</code></div><Button variant="outline" onClick={() => void navigator.clipboard.writeText(newCode)}><Copy className="h-4 w-4" />Copy code</Button></div> : null}

    <div className="flex gap-2 rounded-2xl border border-border bg-card p-2"><button type="button" onClick={() => { setSection('invitations'); setForm({}) }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${section === 'invitations' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Invite Codes</button><button type="button" onClick={() => { setSection('notices'); setForm({}) }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${section === 'notices' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Announcements</button></div>

    {section === 'invitations' ? <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary" />Create invite code</CardTitle><CardDescription>Select the person’s role and where they belong. The code is generated automatically.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void createInvite() }}><select className={selectClass} value={role} onChange={(event) => set('role', event.target.value)}><option value="teacher">Teacher</option><option value="coordinator">Coordinator / HOD</option><option value="cr">Class Representative</option><option value="reviewer">Reviewer</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select><Input type="email" placeholder="Email, optional" value={value('email')} onChange={(event) => set('email', event.target.value)} />{needsDepartment ? <select className={selectClass} value={value('departmentCode')} onChange={(event) => set('departmentCode', event.target.value)} required><option value="">Select department</option>{data.departments.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select> : null}{needsClass ? <select className={selectClass} value={value('classGroupId')} onChange={(event) => set('classGroupId', event.target.value)} required><option value="">Select class</option>{data.classGroups.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}<Button type="submit" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Creating…' : 'Create code'}</Button></form></CardContent></Card> : null}

    {section === 'notices' ? <Card surface="elevated"><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />New announcement</CardTitle><CardDescription>Write the message and choose who should see it.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void act('notice.create', { title: value('title'), body: value('body'), status: 'published', audience: { role: value('audienceRole') || null } }, 'Announcement published.') }}><Input placeholder="Title" value={value('title')} onChange={(event) => set('title', event.target.value)} required /><select className={selectClass} value={value('audienceRole')} onChange={(event) => set('audienceRole', event.target.value)}><option value="">Everyone</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="coordinator">Coordinators</option><option value="cr">Class Representatives</option></select><textarea className="min-h-28 rounded-xl border border-input bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Write your announcement" value={value('body')} onChange={(event) => set('body', event.target.value)} required /><Button type="submit" disabled={busy} className="md:col-span-2"><Megaphone className="h-4 w-4" />{busy ? 'Publishing…' : 'Publish announcement'}</Button></form></CardContent></Card> : null}

    <Card surface="elevated"><CardHeader><CardTitle>{section === 'invitations' ? 'Recent invite codes' : 'Recent announcements'}</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{section === 'invitations' ? data.invitations.map((item) => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black capitalize">{item.role}</p><Badge variant={item.status === 'active' ? 'secondary' : 'destructive'}>{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.email || 'Any email'} · {item.departmentCode || 'No department'} · {item.useCount}/{item.maxUses} used</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(item.code)}><Copy className="h-4 w-4" />Copy</Button>{item.status === 'active' ? <Button size="sm" variant="outline" onClick={() => void act('invite.revoke', { id: item.id }, 'Invite revoked.')}><Archive className="h-4 w-4" />Revoke</Button> : <Button size="sm" variant="outline" onClick={() => void act('invite.restore', { id: item.id }, 'Invite restored.')}><RotateCcw className="h-4 w-4" />Restore</Button>}{!item.used && item.useCount === 0 ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Delete this unused invite?')) void act('invite.delete', { id: item.id, confirmation: 'DELETE INVITE' }, 'Invite deleted.') }}><Trash2 className="h-4 w-4" /></Button> : null}</div></article>) : data.notices.map((item) => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{item.title}</p><Badge variant={item.status === 'published' ? 'secondary' : 'outline'}>{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.body.slice(0, 140)}</p></div><div>{item.status === 'published' ? <Button size="sm" variant="outline" onClick={() => void act('notice.archive', { id: item.id }, 'Announcement archived.')}><Archive className="h-4 w-4" />Archive</Button> : <Button size="sm" variant="outline" onClick={() => void act('notice.publish', { id: item.id }, 'Announcement published.')}><Megaphone className="h-4 w-4" />Publish</Button>}</div></article>)}</div></CardContent></Card>
  </div>
}
