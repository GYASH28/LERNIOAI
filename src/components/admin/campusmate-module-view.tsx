'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Archive, ArrowRight, Building2, Database, Plus, RefreshCw, RotateCcw, Rows3, Trash2 } from 'lucide-react'
import type { AdminModuleData } from '@/lib/admin/campusmate-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } }
type Counts = Record<string, number>
type HierarchySection = 'institutions' | 'departments' | 'programmes' | 'schemes' | 'semesters' | 'classes'
type ControlData = {
  institutions: Array<{ id: string; code: string; name: string; city: string | null; _count: Counts }>
  departments: Array<{ id: string; code: string; name: string; category: string | null; officialUrl: string | null; status: string; institutionId: string; institution: { code: string; name: string }; _count: Counts }>
  programmes: Array<{ id: string; code: string; name: string; durationSemesters: number | null; intake: number | null; intakeNote: string | null; status: string; departmentId: string; department: { code: string; name: string }; _count: Counts }>
  schemes: Array<{ id: string; code: string; name: string; startYear: number; endYear: number | null; revisionLabel: string | null; status: string; institutionId: string; programmeId: string | null; programme: { code: string; name: string } | null; institution: { code: string; name: string }; _count: Counts }>
  semesters: Array<{ id: string; number: number; name: string; subtitle: string | null; color: string; schemeId: string; scheme: { code: string; name: string }; _count: Counts }>
  classGroups: Array<{ id: string; name: string; code: string | null; semesterNumber: number | null; division: string | null; academicYear: string | null; status: string; institutionId: string; departmentId: string | null; programmeId: string | null; schemeId: string | null; semesterId: string | null; department: { code: string; name: string } | null; _count: Counts }>
}

const selectClass = 'h-11 rounded-xl border border-input bg-background px-3 text-sm'
const labels: Record<HierarchySection, string> = { institutions: 'Institutions', departments: 'Departments', programmes: 'Programmes', schemes: 'Schemes', semesters: 'Semesters', classes: 'Class Groups' }

async function read<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.ok || payload.data === undefined) throw new Error(payload?.error?.message || 'Request failed.')
  return payload.data
}

function badgeVariant(status: string) {
  if (['active', 'approved', 'published', 'verified', 'enabled', 'completed', 'resolved', 'recorded', 'normal'].includes(status.toLowerCase())) return 'secondary' as const
  if (['failed', 'error', 'critical', 'disabled', 'revoked', 'rejected', 'archived'].includes(status.toLowerCase())) return 'destructive' as const
  return 'outline' as const
}

export function CampusmateModuleView({ data }: { data: AdminModuleData }) {
  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><Database className="h-3.5 w-3.5" />Live management data</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">{data.title}</h2><p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{data.description}</p></section>
    {data.metrics.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.metrics.map((metric) => <Card key={metric.label} className="min-h-36" surface="panel"><CardHeader className="pb-2"><CardDescription>{metric.label}</CardDescription><CardTitle className="text-3xl font-black tracking-tight">{metric.value}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent></Card>)}</section> : null}
    <Card surface="elevated"><CardHeader className="border-b border-border/70"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Rows3 className="h-5 w-5 text-primary" />Recent records</CardTitle><CardDescription>Latest operational records for this management area.</CardDescription></div><Link href="/admin/audit" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Audit Explorer <ArrowRight className="h-4 w-4" /></Link></div></CardHeader><CardContent className="p-0">{data.rows.length ? <div className="divide-y divide-border/70">{data.rows.map((row) => <article key={row.id} className="grid gap-3 px-5 py-4 hover:bg-muted/35 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{row.title}</h3><Badge variant={badgeVariant(row.status)} className="capitalize">{row.status}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{row.subtitle}</p></div><p className="text-xs font-medium text-muted-foreground md:text-right">{row.meta}</p></article>)}</div> : <div className="grid min-h-52 place-items-center p-8 text-center"><p className="text-sm text-muted-foreground">{data.emptyMessage}</p></div>}</CardContent></Card>
  </div>
}

export function AdminHierarchyControlPanel({ initialSection = 'departments' }: { initialSection?: HierarchySection }) {
  const [section, setSection] = useState<HierarchySection>(initialSection)
  const [data, setData] = useState<ControlData | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    try { setData(await read<ControlData>(await fetch('/api/admin/users?controlPlane=1', { cache: 'no-store' }))) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load hierarchy.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setSection(initialSection); setForm({}) }, [initialSection])

  const value = (key: string) => form[key] || ''
  const set = (key: string, next: string) => setForm((current) => ({ ...current, [key]: next }))
  async function action(name: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('')
    try { await read(await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, ...payload }) })); setMessage(success); setForm({}); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.') }
    finally { setBusy(false) }
  }

  const create = async () => {
    if (section === 'institutions') return action('institution.create', { code: value('code'), name: value('name'), city: value('city') || null }, 'Institution created.')
    if (section === 'departments') return action('department.create', { institutionId: value('institutionId'), code: value('code'), name: value('name'), category: value('category') || null, officialUrl: value('officialUrl') || null }, 'Department created.')
    if (section === 'programmes') return action('programme.create', { departmentId: value('departmentId'), code: value('code'), name: value('name'), durationSemesters: Number(value('durationSemesters') || 6), intake: value('intake') ? Number(value('intake')) : null }, 'Programme created.')
    if (section === 'schemes') return action('scheme.create', { institutionId: value('institutionId'), programmeId: value('programmeId') || null, code: value('code'), name: value('name'), startYear: Number(value('startYear') || new Date().getFullYear()), status: value('status') || 'draft' }, 'Scheme created.')
    if (section === 'semesters') return action('semester.create', { schemeId: value('schemeId'), number: Number(value('number') || 1), name: value('name') || `Semester ${value('number') || 1}`, color: value('color') || '#7c3aed' }, 'Semester created.')
    return action('classGroup.create', { institutionId: value('institutionId'), departmentId: value('departmentId') || null, name: value('name'), code: value('code') || null, semesterNumber: value('semesterNumber') ? Number(value('semesterNumber')) : null, division: value('division') || null, academicYear: value('academicYear') || null }, 'Class group created.')
  }

  const items = useMemo(() => {
    if (!data) return []
    if (section === 'institutions') return data.institutions.map((x) => ({ id: x.id, title: `${x.code} · ${x.name}`, detail: `${x.city || 'No city'} · ${x._count.departments || 0} departments`, status: 'active', raw: x }))
    if (section === 'departments') return data.departments.map((x) => ({ id: x.id, title: `${x.code} · ${x.name}`, detail: `${x.institution.code} · ${x._count.programmes || 0} programmes · ${x._count.classGroups || 0} classes`, status: x.status, raw: x }))
    if (section === 'programmes') return data.programmes.map((x) => ({ id: x.id, title: `${x.code} · ${x.name}`, detail: `${x.department.code} · ${x.durationSemesters || '—'} semesters · intake ${x.intake ?? '—'}`, status: x.status, raw: x }))
    if (section === 'schemes') return data.schemes.map((x) => ({ id: x.id, title: `${x.code} · ${x.name}`, detail: `${x.programme?.code || x.institution.code} · ${x.startYear} · ${x._count.semesters || 0} semesters`, status: x.status, raw: x }))
    if (section === 'semesters') return data.semesters.map((x) => ({ id: x.id, title: `${x.scheme.code} · ${x.name}`, detail: `${x._count.subjects || 0} subjects · ${x._count.classGroups || 0} classes`, status: 'active', raw: x }))
    return data.classGroups.map((x) => ({ id: x.id, title: `${x.code || x.name} · ${x.name}`, detail: `${x.department?.code || 'No department'} · Sem ${x.semesterNumber || '—'} · ${x._count.memberships || 0} members`, status: x.status, raw: x }))
  }, [data, section])

  if (!data) return <div className="grid min-h-[60vh] place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-primary" /></div>

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary"><Building2 className="h-3.5 w-3.5" />Academic hierarchy control</div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Create and govern the complete hierarchy.</h2><p className="mt-3 max-w-3xl text-muted-foreground">Archive dependent records safely; permanently delete only unused semesters.</p></div><Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button></div></section>
    {message ? <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">{(Object.keys(labels) as HierarchySection[]).map((key) => <button key={key} type="button" onClick={() => { setSection(key); setForm({}) }} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{labels[key]}</button>)}</div>
    <Card surface="elevated"><CardHeader><CardTitle>Add {labels[section].replace(/s$/, '')}</CardTitle><CardDescription>Required relationships are validated on the server.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void create() }}>
      {section === 'institutions' ? <><Input placeholder="Code" value={value('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} required /><Input placeholder="Institution name" value={value('name')} onChange={(e) => set('name', e.target.value)} required /><Input placeholder="City" value={value('city')} onChange={(e) => set('city', e.target.value)} /></> : null}
      {section === 'departments' ? <><select className={selectClass} value={value('institutionId')} onChange={(e) => set('institutionId', e.target.value)} required><option value="">Institution</option>{data.institutions.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><Input placeholder="Code" value={value('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} required /><Input placeholder="Department name" value={value('name')} onChange={(e) => set('name', e.target.value)} required /><Input placeholder="Category" value={value('category')} onChange={(e) => set('category', e.target.value)} /><Input placeholder="Official URL" value={value('officialUrl')} onChange={(e) => set('officialUrl', e.target.value)} /></> : null}
      {section === 'programmes' ? <><select className={selectClass} value={value('departmentId')} onChange={(e) => set('departmentId', e.target.value)} required><option value="">Department</option>{data.departments.filter((x) => x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><Input placeholder="Code" value={value('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} required /><Input placeholder="Programme name" value={value('name')} onChange={(e) => set('name', e.target.value)} required /><Input type="number" placeholder="Semesters" value={value('durationSemesters')} onChange={(e) => set('durationSemesters', e.target.value)} /><Input type="number" placeholder="Intake" value={value('intake')} onChange={(e) => set('intake', e.target.value)} /></> : null}
      {section === 'schemes' ? <><select className={selectClass} value={value('institutionId')} onChange={(e) => set('institutionId', e.target.value)} required><option value="">Institution</option>{data.institutions.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><select className={selectClass} value={value('programmeId')} onChange={(e) => set('programmeId', e.target.value)}><option value="">Institution-wide</option>{data.programmes.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><Input placeholder="Code" value={value('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} required /><Input placeholder="Scheme name" value={value('name')} onChange={(e) => set('name', e.target.value)} required /><Input type="number" placeholder="Start year" value={value('startYear')} onChange={(e) => set('startYear', e.target.value)} /></> : null}
      {section === 'semesters' ? <><select className={selectClass} value={value('schemeId')} onChange={(e) => set('schemeId', e.target.value)} required><option value="">Scheme</option>{data.schemes.filter((x) => x.status !== 'archived').map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><Input type="number" placeholder="Number" value={value('number')} onChange={(e) => set('number', e.target.value)} required /><Input placeholder="Name" value={value('name')} onChange={(e) => set('name', e.target.value)} /><Input type="color" value={value('color') || '#7c3aed'} onChange={(e) => set('color', e.target.value)} /></> : null}
      {section === 'classes' ? <><select className={selectClass} value={value('institutionId')} onChange={(e) => set('institutionId', e.target.value)} required><option value="">Institution</option>{data.institutions.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><select className={selectClass} value={value('departmentId')} onChange={(e) => set('departmentId', e.target.value)}><option value="">Department</option>{data.departments.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><Input placeholder="Class name" value={value('name')} onChange={(e) => set('name', e.target.value)} required /><Input placeholder="Class code" value={value('code')} onChange={(e) => set('code', e.target.value.toUpperCase())} /><Input placeholder="Academic year" value={value('academicYear')} onChange={(e) => set('academicYear', e.target.value)} /></> : null}
      <Button type="submit" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Working…' : 'Create'}</Button>
    </form></CardContent></Card>
    <Card surface="elevated"><CardHeader><CardTitle>{labels[section]}</CardTitle><CardDescription>Edit, archive, restore or remove records according to dependency rules.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{items.map((item) => <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><p className="font-black">{item.title}</p><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div><div className="flex flex-wrap gap-2">{section === 'departments' || section === 'programmes' || section === 'classes' ? item.status === 'active' ? <Button size="sm" variant="outline" onClick={() => { const raw = item.raw as { code?: string | null; name: string }; const identity = raw.code || raw.name; void action(section === 'departments' ? 'department.archive' : section === 'programmes' ? 'programme.archive' : 'classGroup.archive', { id: item.id, confirmation: window.prompt(`Type ${identity}`) || '' }, 'Record archived.') }}><Archive className="h-4 w-4" />Archive</Button> : <Button size="sm" variant="outline" onClick={() => void action(section === 'departments' ? 'department.restore' : section === 'programmes' ? 'programme.restore' : 'classGroup.restore', { id: item.id }, 'Record restored.')}><RotateCcw className="h-4 w-4" />Restore</Button> : null}{section === 'schemes' ? <Button size="sm" variant="outline" onClick={() => { const raw = item.raw as ControlData['schemes'][number]; void action('scheme.update', { id: raw.id, name: raw.name, endYear: raw.endYear, revisionLabel: raw.revisionLabel, status: raw.status === 'published' ? 'archived' : 'published' }, raw.status === 'published' ? 'Scheme archived.' : 'Scheme published.') }}>{item.status === 'published' ? 'Archive' : 'Publish'}</Button> : null}{section === 'semesters' ? <Button size="sm" variant="destructive" onClick={() => { if (window.prompt('Type DELETE SEMESTER') === 'DELETE SEMESTER') void action('semester.delete', { id: item.id, confirmation: 'DELETE SEMESTER' }, 'Semester deleted.') }}><Trash2 className="h-4 w-4" />Delete</Button> : null}</div></article>)}</div></CardContent></Card>
  </div>
}
