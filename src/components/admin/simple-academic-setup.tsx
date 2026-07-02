'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, Building2, Plus, RefreshCw, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Section = 'departments' | 'programmes' | 'classes'
type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type Counts = Record<string, number>
type Data = {
  institutions: Array<{ id: string; name: string }>
  departments: Array<{ id: string; code: string; name: string; status: string; institutionId: string; _count: Counts }>
  programmes: Array<{ id: string; code: string; name: string; status: string; departmentId: string; durationSemesters: number | null; intake: number | null; department: { name: string; institutionId: string } }>
  classGroups: Array<{ id: string; code: string | null; name: string; status: string; semesterNumber: number | null; division: string | null; academicYear: string | null; department: { name: string } | null; _count: Counts }>
}

const labels: Record<Section, string> = { departments: 'Departments', programmes: 'Programmes', classes: 'Classes' }
const selectClass = 'h-11 rounded-xl border border-input bg-background px-3 text-sm'

async function read<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) throw new Error(payload?.error?.message || 'Request failed.')
  return payload.data
}

function codeFor(name: string, prefix: string) {
  const initials = name.trim().toUpperCase().split(/\s+/).map((word) => word[0]).join('').replace(/[^A-Z0-9]/g, '').slice(0, 6) || prefix
  return `${prefix}-${initials}-${Date.now().toString(36).slice(-3).toUpperCase()}`
}

export function SimpleAcademicSetup({ initialSection = 'departments' }: { initialSection?: Section }) {
  const [section, setSection] = useState<Section>(initialSection)
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const value = (key: string) => form[key] || ''
  const set = (key: string, next: string) => setForm((current) => ({ ...current, [key]: next }))

  const load = useCallback(async () => {
    setBusy(true)
    try { setData(await read<Data>(await fetch('/api/admin/users?controlPlane=1', { cache: 'no-store' }))) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load academic setup.') }
    finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setSection(initialSection); setForm({}) }, [initialSection])

  async function act(action: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('')
    try {
      await read(await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) }))
      setMessage(success); setForm({}); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.') }
    finally { setBusy(false) }
  }

  async function create() {
    if (!data) return
    if (section === 'departments') {
      const institutionId = value('institutionId') || data.institutions[0]?.id
      if (!institutionId) return setMessage('No institution is available.')
      return act('department.create', { institutionId, code: codeFor(value('name'), 'DEP'), name: value('name'), category: value('category') || null, officialUrl: null }, 'Department added.')
    }
    if (section === 'programmes') {
      return act('programme.create', { departmentId: value('departmentId'), code: codeFor(value('name'), 'PRG'), name: value('name'), durationSemesters: Number(value('durationSemesters') || 6), intake: value('intake') ? Number(value('intake')) : null }, 'Programme added.')
    }
    const department = data.departments.find((item) => item.id === value('departmentId'))
    if (!department) return setMessage('Select a department.')
    return act('classGroup.create', { institutionId: department.institutionId, departmentId: department.id, name: value('name'), code: codeFor(value('name'), 'CLS'), semesterNumber: Number(value('semesterNumber') || 1), division: value('division') || 'A', academicYear: value('academicYear') || null }, 'Class added.')
  }

  const rows = useMemo(() => {
    if (!data) return []
    if (section === 'departments') return data.departments.map((item) => ({ id: item.id, identity: item.code, title: item.name, detail: `${item._count.programmes || 0} programmes · ${item._count.classGroups || 0} classes`, status: item.status }))
    if (section === 'programmes') return data.programmes.map((item) => ({ id: item.id, identity: item.code, title: item.name, detail: `${item.department.name} · ${item.durationSemesters || 6} semesters${item.intake ? ` · ${item.intake} intake` : ''}`, status: item.status }))
    return data.classGroups.map((item) => ({ id: item.id, identity: item.code || item.name, title: item.name, detail: `${item.department?.name || 'No department'} · Semester ${item.semesterNumber || '—'} · Division ${item.division || '—'} · ${item._count.memberships || 0} students`, status: item.status }))
  }, [data, section])

  if (!data) return <div className="grid min-h-[60vh] place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-primary" /></div>

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><Building2 className="h-3.5 w-3.5" />Academic Setup</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Departments, programmes, and classes</h2><p className="mt-3 text-muted-foreground">Enter normal names. Lernio creates internal codes automatically.</p></div><Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div></section>
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    <div className="flex gap-2 rounded-2xl border border-border bg-card p-2">{(Object.keys(labels) as Section[]).map((key) => <button key={key} type="button" onClick={() => { setSection(key); setForm({}) }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{labels[key]}</button>)}</div>

    <Card surface="elevated"><CardHeader><CardTitle>Add {section === 'classes' ? 'class' : section.slice(0, -1)}</CardTitle><CardDescription>Only the useful details are required.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void create() }}>
      {section === 'departments' ? <><Input placeholder="Department name" value={value('name')} onChange={(event) => set('name', event.target.value)} required /><Input placeholder="Category, optional" value={value('category')} onChange={(event) => set('category', event.target.value)} /></> : null}
      {section === 'programmes' ? <><select className={selectClass} value={value('departmentId')} onChange={(event) => set('departmentId', event.target.value)} required><option value="">Select department</option>{data.departments.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input placeholder="Programme name" value={value('name')} onChange={(event) => set('name', event.target.value)} required /><Input type="number" min="1" max="16" placeholder="Total semesters" value={value('durationSemesters')} onChange={(event) => set('durationSemesters', event.target.value)} /><Input type="number" min="0" placeholder="Student intake, optional" value={value('intake')} onChange={(event) => set('intake', event.target.value)} /></> : null}
      {section === 'classes' ? <><select className={selectClass} value={value('departmentId')} onChange={(event) => set('departmentId', event.target.value)} required><option value="">Select department</option>{data.departments.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input placeholder="Class name" value={value('name')} onChange={(event) => set('name', event.target.value)} required /><Input type="number" min="1" max="16" placeholder="Semester" value={value('semesterNumber')} onChange={(event) => set('semesterNumber', event.target.value)} /><Input placeholder="Division" value={value('division')} onChange={(event) => set('division', event.target.value.toUpperCase())} /><Input placeholder="Academic year, optional" value={value('academicYear')} onChange={(event) => set('academicYear', event.target.value)} /></> : null}
      <Button type="submit" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Adding…' : 'Add'}</Button>
    </form></CardContent></Card>

    <Card surface="elevated"><CardHeader><CardTitle>{labels[section]}</CardTitle><CardDescription>Active and archived items.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{rows.map((item) => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{item.title}</p><Badge variant={item.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div><div>{item.status === 'active' ? <Button size="sm" variant="outline" onClick={() => { if (!window.confirm(`Archive ${item.title}?`)) return; void act(section === 'departments' ? 'department.archive' : section === 'programmes' ? 'programme.archive' : 'classGroup.archive', { id: item.id, confirmation: item.identity }, `${item.title} archived.`) }}><Archive className="h-4 w-4" />Archive</Button> : <Button size="sm" variant="outline" onClick={() => void act(section === 'departments' ? 'department.restore' : section === 'programmes' ? 'programme.restore' : 'classGroup.restore', { id: item.id }, `${item.title} restored.`)}><RotateCcw className="h-4 w-4" />Restore</Button>}</div></article>)}</div></CardContent></Card>
  </div>
}
