'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search, FileText, FileCode, Image as ImageIcon, Link as LinkIcon, Video, Book,
  Upload, Star, Download, Eye, ShieldCheck, ExternalLink, FileWarning, Pencil, Send, Archive,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Subject } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Resource {
  id: string
  title: string
  type: string
  url?: string | null
  content?: string | null
  subjectId: string
  unitNumber?: number | null
  topicId?: string | null
  source: string
  visibility: string
  verified: boolean
  contributorId?: string | null
  year?: number | null
  language?: string
  downloads: number
  rating: number
  createdAt: string
  lessonResource?: {
    id: string
    role: string
    isPrimary: boolean
    isRequired: boolean
    startSeconds?: number | null
    endSeconds?: number | null
    coveragePercentage?: number | null
  }
}

interface Contribution {
  id: string
  userId: string
  title: string
  type: string
  subjectId?: string | null
  unitNumber?: number | null
  topicId?: string | null
  content?: string | null
  fileUrl?: string | null
  status: string
  moderatorNote?: string | null
  reviewerId?: string | null
  rating: number
  reports: number
  createdAt: string
  updatedAt: string
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText, docx: FileText, image: ImageIcon, text: FileText,
  video_link: Video, web_link: LinkIcon, code: FileCode,
  lab_manual: Book, question_paper: FileText, model_answer: FileText,
}

// Types that need a URL (link / file). Everything else is content-based.
const URL_TYPES = new Set(['web_link', 'video_link', 'pdf', 'docx', 'image', 'lab_manual', 'question_paper', 'model_answer'])
const CONTENT_TYPES = new Set(['text', 'code'])

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function MaterialsView() {
  const { subjects, pushMascotToast } = useAppStore()
  const [materials, setMaterials] = useState<Resource[]>([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState('all')
  const [lessonFilter, setLessonFilter] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('lessonId') ?? ''
  })
  const [typeFilter, setTypeFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contribOpen, setContribOpen] = useState(false)
  const [tab, setTab] = useState('browse')
  const [previewResource, setPreviewResource] = useState<Resource | null>(null)
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectFilter) ?? null,
    [subjects, subjectFilter],
  )
  const availableUnits = useMemo(() => selectedSubject?.units ?? [], [selectedSubject])
  const selectedUnit = useMemo(
    () => availableUnits.find((unit) => String(unit.number) === unitFilter) ?? null,
    [availableUnits, unitFilter],
  )
  const availableTopics = useMemo(() => selectedUnit?.topics ?? [], [selectedUnit])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (subjectFilter !== 'all') params.set('subjectId', subjectFilter)
    if (unitFilter !== 'all') params.set('unitNumber', unitFilter)
    if (topicFilter !== 'all') params.set('topicId', topicFilter)
    if (lessonFilter) params.set('lessonId', lessonFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (languageFilter !== 'all') params.set('language', languageFilter)
    if (search) params.set('q', search)
    fetch(`/api/materials?${params}`)
      .then((r) => r.json())
      .then((d) => { setMaterials(d.data || []); setLoading(false) })
      .catch(() => { setMaterials([]); setLoading(false) })
  }, [subjectFilter, unitFilter, topicFilter, lessonFilter, typeFilter, languageFilter, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const updateSubjectFilter = (value: string) => {
    setSubjectFilter(value)
    setUnitFilter('all')
    setTopicFilter('all')
  }

  const updateUnitFilter = (value: string) => {
    setUnitFilter(value)
    setTopicFilter('all')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mascot mascot="leo" state="explaining" size={48} />
        <div className="flex-1">
          <h2 className="text-lg font-bold">Materials Library</h2>
          <p className="text-sm text-muted-foreground">Notes, question papers, lab manuals, and more.</p>
        </div>
        <Dialog open={contribOpen} onOpenChange={setContribOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Upload className="h-4 w-4" /> Contribute</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <ContributeForm
              subjects={subjects}
              onSaved={() => {
                setContribOpen(false)
                pushMascotToast({
                  mascot: 'leo',
                  state: 'correct',
                  message: 'Material submitted for review! You\'ll earn +50 XP once approved.',
                })
                if (tab === 'my') {
                  // Force MyContributions to refetch
                  setTab('browse')
                  setTimeout(() => setTab('my'), 0)
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="my">My Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {lessonFilter && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">Lesson-scoped materials</p>
                    <p className="text-meta text-muted-foreground">
                      Showing approved resources mapped to the selected lesson.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLessonFilter('')}>
                    Clear
                  </Button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials..." className="pl-9" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
                <Select value={subjectFilter} onValueChange={updateSubjectFilter}>
                  <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={unitFilter} onValueChange={updateUnitFilter} disabled={!selectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.number)}>Unit {unit.number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={topicFilter} onValueChange={setTopicFilter} disabled={!selectedUnit}>
                  <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {availableTopics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video_link">Video</SelectItem>
                    <SelectItem value="web_link">Web Link</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="lab_manual">Lab Manual</SelectItem>
                    <SelectItem value="question_paper">Question Paper</SelectItem>
                    <SelectItem value="model_answer">Model Answer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="mr">Marathi</SelectItem>
                    <SelectItem value="en-Hinglish">Hinglish</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer">
                  <Checkbox checked={verifiedOnly} onCheckedChange={(c) => setVerifiedOnly(!!c)} />
                  <span className="text-sm">Verified only</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : materials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.filter((m) => !verifiedOnly || m.verified).map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  subjects={subjects}
                  onPreview={() => setPreviewResource(m)}
                />
              ))}
            </div>
          ) : (
            <Card><CardContent className="p-8 text-center">
              <Mascot mascot="leo" state="idle" size={56} className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">No materials found.</p>
              <p className="text-xs text-muted-foreground">Try adjusting filters or contribute your own!</p>
            </CardContent></Card>
          )}

          <div className="text-xs text-muted-foreground text-center italic">
            Do not redistribute copyrighted textbooks without permission.
          </div>
        </TabsContent>

        <TabsContent value="my">
          <MyContributions />
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <PreviewDialog resource={previewResource} onClose={() => setPreviewResource(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Material card — Preview opens the dialog; Download does a real download.
// ---------------------------------------------------------------------------

function MaterialCard({ material, subjects, onPreview }: {
  material: Resource
  subjects: Subject[]
  onPreview: () => void
}) {
  const Icon = TYPE_ICONS[material.type] || FileText
  const subject = subjects.find((s) => s.id === material.subjectId)

  const handleDownload = async () => {
    // 1. Trigger the actual file download.
    if (material.url) {
      // Server increments downloads via the download endpoint; the file itself
      // is opened directly so cross-origin links still work.
      try {
        await fetch('/api/materials/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId: material.id }),
        })
      } catch {
        // Analytics is best-effort — never block the download.
      }
      window.open(material.url, '_blank', 'noopener,noreferrer')
      return
    }
    if (material.content) {
      // Content-only resource — synthesise a .txt blob and download it.
      const blob = new Blob([material.content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${material.title.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      try {
        await fetch('/api/materials/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId: material.id }),
        })
      } catch {
        // best-effort
      }
      return
    }
    toast.info('This material has no downloadable file or content.')
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-tight">{material.title}</p>
              {material.verified && <ShieldCheck className="h-4 w-4 text-success shrink-0" />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {subject && <Badge variant="outline" className="text-meta">{subject.code}</Badge>}
              {material.unitNumber && <Badge variant="outline" className="text-meta">Unit {material.unitNumber}</Badge>}
              {material.lessonResource && (
                <Badge variant="outline" className="text-meta">
                  {material.lessonResource.role.replace('_', ' ')}
                </Badge>
              )}
              <Badge variant="secondary" className="text-meta capitalize">{material.type.replace('_', ' ')}</Badge>
              <Badge variant="outline" className="text-meta capitalize">{material.source}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-2 text-meta text-muted-foreground">
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3" />{material.rating || 0}</span>
              <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{material.downloads}</span>
              {material.year && <span>{material.year}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onPreview}>
            <Eye className="h-3 w-3" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Preview dialog — type-aware rendering (web_link / video_link / text / code /
// pdf / image / other).
// ---------------------------------------------------------------------------

function PreviewDialog({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  // Safe react-markdown component map — only renders trusted user-supplied text content.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const markdownComponents: Record<string, any> = {
    a: ({ children, ...props }: any) => (
      <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer noopener" {...props}>{children}</a>
    ),
    code: ({ children, ...props }: any) => (
      <code className="font-mono bg-muted text-foreground px-1.5 py-0.5 rounded text-[0.85em]" {...props}>{children}</code>
    ),
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <Dialog open={!!resource} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{resource?.title}</DialogTitle>
          <DialogDescription className="capitalize">
            {resource?.type.replace('_', ' ')}
            {resource?.unitNumber ? ` · Unit ${resource.unitNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        {!resource ? null : resource.type === 'web_link' || resource.type === 'video_link' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground break-all">{resource.url}</p>
            <Button asChild className="gap-2">
              <a href={resource.url ?? '#'} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" /> Open externally
              </a>
            </Button>
          </div>
        ) : resource.type === 'text' ? (
          <ScrollArea className="h-[60vh] rounded-lg border p-4">
            <div className="lesson-prose prose prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {resource.content || 'No content available.'}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        ) : resource.type === 'code' ? (
          <ScrollArea className="h-[60vh] rounded-lg border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {resource.content || 'No code available.'}
            </pre>
          </ScrollArea>
        ) : resource.type === 'image' && resource.url ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <img
              src={resource.url}
              alt={resource.title}
              className="max-w-full max-h-[60vh] rounded-lg"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (resource.type === 'pdf' || resource.type === 'docx') && resource.url ? (
          <iframe
            src={resource.url}
            title={resource.title}
            className="w-full h-[60vh] rounded-lg border"
          />
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <FileWarning className="h-8 w-8" />
            <p>Preview not available for this file type.</p>
            {resource.url && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={resource.url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="h-3.5 w-3.5" /> Open externally
                </a>
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Contribution form — strict URL vs content split, mandatory copyright ack.
// ---------------------------------------------------------------------------

function ContributeForm({ subjects, onSaved, initial }: {
  subjects: Subject[]
  onSaved: () => void
  initial?: Contribution | null
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [type, setType] = useState<string>(initial?.type || 'pdf')
  const [subjectId, setSubjectId] = useState(initial?.subjectId || '')
  const [unitNumber, setUnitNumber] = useState(initial?.unitNumber ? String(initial.unitNumber) : '')
  // Either content OR fileUrl — never both. Toggle driven by `type`.
  const [content, setContent] = useState(initial?.content || '')
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl || '')
  const [copyright, setCopyright] = useState(false)
  const [saving, setSaving] = useState(false)

  const needsUrl = URL_TYPES.has(type)
  const needsContent = CONTENT_TYPES.has(type)

  // When the type changes, clear the irrelevant field so the submit body is clean.
  const handleTypeChange = (t: string) => {
    setType(t)
    if (URL_TYPES.has(t)) setContent('')
    if (CONTENT_TYPES.has(t)) setFileUrl('')
  }

  const canSubmit =
    !!title &&
    !!subjectId &&
    copyright &&
    (needsUrl ? !!fileUrl : needsContent ? !!content : true)

  const submit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title,
        type,
        subjectId,
        unitNumber: unitNumber ? parseInt(unitNumber, 10) : undefined,
        copyrightAcknowledged: true,
      }
      if (needsUrl) body.fileUrl = fileUrl
      if (needsContent) body.content = content

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Could not submit.')
        setSaving(false)
        return
      }
      onSaved()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>{initial ? 'Edit Contribution' : 'Contribute Material'}</DialogTitle>
        <DialogDescription>
          Submissions go through moderation before they appear in the public library.
        </DialogDescription>
      </DialogHeader>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Data Structures Unit 3 Notes" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="web_link">Web Link</SelectItem>
              <SelectItem value="video_link">Video Link</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="lab_manual">Lab Manual</SelectItem>
              <SelectItem value="question_paper">Question Paper</SelectItem>
              <SelectItem value="model_answer">Model Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Unit (optional)</Label>
        <Input type="number" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className="mt-1" min={1} max={6} />
      </div>

      {needsUrl ? (
        <div>
          <Label className="text-xs">URL <span className="text-destructive">*</span></Label>
          <Input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="mt-1"
            placeholder="https://example.com/your-material.pdf"
          />
          <p className="text-meta text-muted-foreground mt-1">A direct link to the file or resource is required for this type.</p>
        </div>
      ) : needsContent ? (
        <div>
          <Label className="text-xs">Content <span className="text-destructive">*</span></Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 min-h-40 font-mono text-xs"
            placeholder={type === 'code' ? '// Paste your code here' : 'Type or paste your notes here. Markdown is supported for text materials.'}
          />
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <Checkbox checked={copyright} onCheckedChange={(c) => setCopyright(!!c)} className="mt-0.5" />
        <span>
          I declare this material does not violate copyright and I have the right to share it.
          <span className="text-destructive"> *</span>
        </span>
      </label>

      <Button onClick={submit} disabled={!canSubmit || saving} className="w-full gap-2">
        {saving ? 'Submitting…' : <><Send className="h-4 w-4" /> Submit for Review</>}
      </Button>
      <p className="text-meta text-muted-foreground text-center">
        Your submission goes through: Submitted → Under Review → Approved/Rejected → Published
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// My Contributions — fetches /api/materials?mine=true, shows status badges,
// moderator feedback, and Edit / Submit / Withdraw actions.
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600',
  submitted: 'bg-blue-500/10 text-blue-600',
  under_review: 'bg-amber-500/10 text-amber-600',
  requires_changes: 'bg-orange-500/10 text-orange-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-rose-500/10 text-rose-600',
  archived: 'bg-gray-500/10 text-gray-600',
}

function MyContributions() {
  const [contribs, setContribs] = useState<Contribution[]>([])
  const [promoted, setPromoted] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/materials?mine=true')
      .then((r) => r.json())
      .then((d) => {
        const data = d.data || {}
        setContribs(Array.isArray(data) ? data : (data.contributions || []))
        setPromoted(Array.isArray(data) ? [] : (data.promotedResources || []))
        setLoading(false)
      })
      .catch(() => { setLoading(false) })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const res = await fetch('/api/materials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributionId: id, ...body }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Action failed.')
        return
      }
      toast.success('Updated.')
      load()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">My Submissions</h3>
            <Badge variant="outline">{contribs.length} total</Badge>
          </div>
          {contribs.length > 0 ? (
            <div className="space-y-2">
              {contribs.map((c) => {
                const editable = c.status === 'draft' || c.status === 'submitted' || c.status === 'archived'
                const canSubmit = c.status === 'draft' || c.status === 'archived'
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{c.title}</p>
                        <Badge className={cn('capitalize', STATUS_COLORS[c.status] || 'bg-muted text-muted-foreground')}>
                          {c.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{c.type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {new Date(c.updatedAt).toLocaleString()}
                      </p>
                      {c.moderatorNote && (
                        <p className="text-xs mt-1 p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <strong>Moderator:</strong> {c.moderatorNote}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {editable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setEditing(c)}
                          disabled={busyId === c.id}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                      )}
                      {canSubmit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => patch(c.id, { submit: true })}
                          disabled={busyId === c.id}
                        >
                          <Send className="h-3 w-3" /> Submit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-destructive"
                        onClick={() => patch(c.id, { withdraw: true })}
                        disabled={busyId === c.id}
                      >
                        <Archive className="h-3 w-3" /> Withdraw
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mascot mascot="leo" state="idle" size={56} className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">No contributions yet.</p>
              <p className="text-xs text-muted-foreground">Share your notes and materials to help fellow students!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {promoted.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-success" />
              <h3 className="text-sm font-semibold">Approved & Published</h3>
              <Badge variant="outline">{promoted.length}</Badge>
            </div>
            <div className="space-y-2">
              {promoted.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Published {new Date(r.createdAt).toLocaleDateString()} · {r.downloads} downloads
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600">Live</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editing && (
            <EditContributionForm
              contribution={editing}
              onSaved={() => { setEditing(null); load() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit contribution form — uses PATCH with title/content/fileUrl updates.
// ---------------------------------------------------------------------------

function EditContributionForm({ contribution, onSaved }: {
  contribution: Contribution
  onSaved: () => void
}) {
  const [title, setTitle] = useState(contribution.title)
  const [content, setContent] = useState(contribution.content || '')
  const [fileUrl, setFileUrl] = useState(contribution.fileUrl || '')
  const [saving, setSaving] = useState(false)

  const needsUrl = URL_TYPES.has(contribution.type)
  const needsContent = CONTENT_TYPES.has(contribution.type)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { contributionId: contribution.id, title }
      if (needsUrl && fileUrl !== (contribution.fileUrl || '')) body.fileUrl = fileUrl
      if (needsContent && content !== (contribution.content || '')) body.content = content

      const res = await fetch('/api/materials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Could not save.')
        setSaving(false)
        return
      }
      toast.success('Saved.')
      onSaved()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Edit Contribution</DialogTitle>
        <DialogDescription>
          You can only edit while the contribution is in draft / submitted / archived state.
        </DialogDescription>
      </DialogHeader>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>
      {needsUrl && (
        <div>
          <Label className="text-xs">URL</Label>
          <Input type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-1" />
        </div>
      )}
      {needsContent && (
        <div>
          <Label className="text-xs">Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 min-h-40 font-mono text-xs" />
        </div>
      )}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
