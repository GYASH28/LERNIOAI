'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { usePrefs } from '@/components/theme-provider'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  User as UserIcon, Settings, Shield, Info, Zap, Flame,
  Moon, Sun, Monitor, Sparkles, Volume2, Eye, Battery, Download, Trash2, AlertTriangle,
  Palette, Layers, Contrast, Gauge, Sparkle, Move3D, GraduationCap, Cpu, BookOpen,
  Building2, CircuitBoard, Hammer, RadioTower, Landmark, ExternalLink,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PALETTES } from '@/lib/theme-types'
import { cn } from '@/lib/utils'
import { SUBJECT_MASCOTS } from '@/lib/types'
import { CWIT_DEPARTMENTS } from '@/lib/cwit-departments'
import { toast } from 'sonner'
import { StreakFreezeWidget } from '@/components/ui/streak-freeze-widget'
import { AchievementWall } from '@/components/ui/achievement-wall'
import { StudyCalendarHeatmap } from '@/components/ui/study-calendar-heatmap'
import { ThemeStudio } from '@/components/theme/theme-studio'

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  CIVIL: Building2,
  COMP: Cpu,
  CIOT: CircuitBoard,
  ELEC: Zap,
  ENTC: RadioTower,
  MECH: Hammer,
  SH: BookOpen,
}

export function ProfileView() {
  const { user, setUser, subjects } = useAppStore()
  const { pref, setPref } = usePrefs()
  const [name, setName] = useState(user?.name || '')
  const [preferredLang, setPreferredLang] = useState(user?.preferredLang || 'en')
  const [examDate, setExamDate] = useState(user?.examDate?.slice(0, 10) || '')
  const [dailyMins, setDailyMins] = useState(user?.dailyMins || 120)
  const [saving, setSaving] = useState(false)

  // Export / delete state
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [accountDeleted, setAccountDeleted] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/user', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, preferredLang, examDate, dailyMins }),
    })
    const data = await res.json()
    if (data.ok) { setUser(data.data); toast.success('Profile saved!') }
    setSaving(false)
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/user/export')
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Export failed.')
        setExporting(false)
        return
      }
      // Pretty-printed JSON download.
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lernio-my-data.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Your data export has been downloaded.')
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || deleting) return
    setDeleting(true)
    try {
      const res = await fetch('/api/user', { method: 'DELETE' })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Could not delete account.')
        setDeleting(false)
        return
      }
      // Show the goodbye screen — keep state local so the user sees it before
      // the app fully resets.
      setUser(null)
      setAccountDeleted(true)
      setDeleteOpen(false)
      await signOut({ redirect: false })
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Goodbye screen — shown after a successful delete.
  if (accountDeleted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
        <Mascot mascot="leo" state="rest" size={80} className="mx-auto" />
        <h2 className="text-2xl font-bold mt-4">Account deleted</h2>
        <p className="text-sm text-muted-foreground mt-2">
          All your data has been permanently removed from Lernio AI 2.0.
          Thank you for learning with us — we hope to see you again.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Reload Lernio
        </Button>
        <p className="text-xs text-muted-foreground mt-4 italic">
          (In demo mode, the demo student will be re-seeded on next login.)
        </p>
      </div>
    )
  }

  const level = Math.floor((user?.xp || 0) / 200) + 1
  const xpInLevel = (user?.xp || 0) % 200
  const xpPercent = (xpInLevel / 200) * 100

  return (
    <div className="space-y-6">
      {/* Profile Header — premium gradient hero */}
      <Card className="overflow-hidden card-lift">
        <div
          className="h-28 relative"
          style={{
            background: 'linear-gradient(120deg, color-mix(in oklch, var(--primary) 28%, transparent), color-mix(in oklch, oklch(0.65 0.22 340) 22%, transparent), color-mix(in oklch, oklch(0.62 0.17 195) 18%, transparent))',
          }}
        >
          <div className="absolute inset-0 bg-grid opacity-25" />
          <div className="absolute -bottom-2 -right-2 h-32 w-32 rounded-full bg-card/30 blur-2xl" />
        </div>
        <CardContent className="p-5 -mt-14 relative">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              {/* Gradient ring around avatar */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-violet-500 blur-sm opacity-60" />
              <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-background flex items-center justify-center text-meta font-bold text-white shadow-soft">
                {level}
              </div>
            </div>
            <div className="flex-1 mb-1">
              <h2 className="text-lg font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                  <Sparkles className="h-3 w-3" /> Level {level}
                </Badge>
                <Badge variant="outline" className="gap-1 bg-amber-500/5">
                  <Flame className="h-3 w-3 text-amber-500 flame-flicker" /> {user?.streak} days
                </Badge>
                <Badge variant="outline" className="gap-1 bg-primary/5">
                  <Zap className="h-3 w-3 text-primary" /> {user?.xp} XP
                </Badge>
              </div>
            </div>
          </div>
          {/* XP Progress — animated shimmer */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="step-dot" data-state="active">{level}</span>
                Level {level}
              </span>
              <span className="tabular-nums">{xpInLevel} / 200 XP → Level {level + 1}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full progress-shimmer"
                style={{ width: `${xpPercent}%`, transitionDuration: pref.lowPower ? '0ms' : '600ms' }}
              />
            </div>
            <p className="text-meta text-muted-foreground mt-1 text-center">
              {200 - xpInLevel} XP until your next level
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="profile" className="gap-1.5"><UserIcon className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Theme</TabsTrigger>
          <TabsTrigger value="prefs" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Prefs</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Departments</TabsTrigger>
          <TabsTrigger value="mascots" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Mascots</TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5"><Info className="h-3.5 w-3.5" /> About</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Academic Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="profile-full-name" className="text-xs">Full Name</Label>
                <Input id="profile-full-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="profile-institution" className="text-xs">Institution</Label>
                  <Input id="profile-institution" value="Cusrow Wadia Institute of Technology (CWIT)" disabled className="mt-1 bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="profile-semester" className="text-xs">Semester</Label>
                  <Input id="profile-semester" value="Semester 3" disabled className="mt-1 bg-muted/50" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Preferred Language</Label>
                <RadioGroup value={preferredLang} onValueChange={setPreferredLang} className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-sm"><RadioGroupItem value="en" /> English</label>
                  <label className="flex items-center gap-1.5 text-sm"><RadioGroupItem value="hi" /> Hindi</label>
                  <label className="flex items-center gap-1.5 text-sm"><RadioGroupItem value="mr" /> Marathi</label>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="profile-exam-date" className="text-xs">Exam Date</Label>
                  <Input id="profile-exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label id="profile-daily-study-label" className="text-xs">Daily Study Time: {dailyMins} min</Label>
                  <Slider aria-labelledby="profile-daily-study-label" value={[dailyMins]} onValueChange={([v]) => setDailyMins(v)} min={30} max={480} step={30} className="mt-3" />
                </div>
              </div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save Profile'}</Button>
            </CardContent>
          </Card>

          {/* Streak Freeze — full-variant widget */}
          <StreakFreezeWidget variant="full" />

          {/* Achievement Wall — full-variant widget */}
          <AchievementWall variant="full" />

          {/* Study Calendar Heatmap — year-at-a-glance */}
          <StudyCalendarHeatmap />
        </TabsContent>

        {/* THEME */}
        <TabsContent value="theme" className="space-y-4">
          <ThemeStudio />
        </TabsContent>

        {/* PREFERENCES */}
        <TabsContent value="prefs" className="space-y-4">
          {/* ---- Theme Studio ---- */}
          {false && (
          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Theme Studio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Appearance: light / dark / system */}
              <div>
                <Label className="text-xs mb-2 block">Appearance</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: 'light' as const, label: 'Light', icon: Sun },
                    { v: 'dark' as const, label: 'Dark', icon: Moon },
                    { v: 'system' as const, label: 'System', icon: Monitor },
                  ]).map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.v}
                        onClick={() => setPref({ appearance: t.v })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                          pref.appearance === t.v ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        <Icon className="h-5 w-5" /><span className="text-xs">{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Palette swatches */}
              <div>
                <Label className="text-xs mb-2 block flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Color Palette
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPref({ palette: p.id })}
                      className={cn(
                        'group relative rounded-xl border-2 p-3 text-left transition-all',
                        pref.palette === p.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/30',
                      )}
                    >
                      {/* Swatch row */}
                      <div className="flex gap-1.5 mb-2">
                        {(['canvas', 'surface', 'brand', 'accent'] as const).map((key) => (
                          <div
                            key={key}
                            className="h-6 flex-1 rounded-md shadow-sm"
                            style={{ background: p.swatches[key] }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium leading-tight">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{p.description}</p>
                      {p.darkFirst && (
                        <Badge variant="outline" className="absolute top-2 right-2 text-[9px] px-1.5 py-0">Dark-first</Badge>
                      )}
                      {pref.palette === p.id && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-soft">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Granular controls: Contrast / Density / Surface / Tint / Motion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contrast */}
                <div>
                  <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                    <Contrast className="h-3.5 w-3.5" /> Contrast
                  </Label>
                  <div className="flex gap-1.5">
                    {(['normal', 'high'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setPref({ contrast: c })}
                        className={cn(
                          'flex-1 text-xs py-2 px-3 rounded-lg border-2 transition-all font-medium',
                          pref.contrast === c ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        {c === 'high' ? 'High Contrast' : 'Normal'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div>
                  <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" /> Density
                  </Label>
                  <div className="flex gap-1.5">
                    {(['comfortable', 'compact'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setPref({ density: d })}
                        className={cn(
                          'flex-1 text-xs py-2 px-3 rounded-lg border-2 transition-all font-medium',
                          pref.density === d ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        {d === 'compact' ? 'Compact' : 'Comfortable'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surface Style */}
                <div>
                  <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Surface Style
                  </Label>
                  <div className="flex gap-1.5">
                    {(['flat', 'soft', 'glass'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setPref({ surfaceStyle: s })}
                        className={cn(
                          'flex-1 text-xs py-2 px-3 rounded-lg border-2 transition-all font-medium capitalize',
                          pref.surfaceStyle === s ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Tint */}
                <div>
                  <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                    <Sparkle className="h-3.5 w-3.5" /> Subject Tint
                  </Label>
                  <div className="flex gap-1.5">
                    {(['off', 'subtle', 'strong'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPref({ subjectTint: t })}
                        className={cn(
                          'flex-1 text-xs py-2 px-3 rounded-lg border-2 transition-all font-medium capitalize',
                          pref.subjectTint === t ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion Level */}
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                    <Move3D className="h-3.5 w-3.5" /> Motion Level
                  </Label>
                  <div className="flex gap-1.5">
                    {(['full', 'reduced', 'none'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPref({ motion: m })}
                        className={cn(
                          'flex-1 text-xs py-2 px-3 rounded-lg border-2 transition-all font-medium capitalize',
                          pref.motion === m ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30',
                        )}
                      >
                        {m === 'full' ? 'Full' : m === 'reduced' ? 'Reduced' : 'None'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <PrefRow icon={<Eye className="h-4 w-4" />} title="Reduced Motion" desc="Minimize animations (alias for Motion = Reduced)" checked={pref.reducedMotion} onChange={(v) => setPref({ reducedMotion: v })} />
              <PrefRow icon={<Battery className="h-4 w-4" />} title="Low Power Mode" desc="Disables backdrop blur and GPU-heavy effects" checked={pref.lowPower} onChange={(v) => setPref({ lowPower: v })} />
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Mascot &amp; Sound</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PrefRow icon={<Sparkles className="h-4 w-4" />} title="Mascots Enabled" desc="Show learning companions" checked={pref.mascotsEnabled} onChange={(v) => setPref({ mascotsEnabled: v })} />
              <PrefRow icon={<Sparkles className="h-4 w-4" />} title="Compact Mascot" desc="Render mascots at ~70% size (sidebar, footer, toasts)" checked={pref.compactMascot} onChange={(v) => setPref({ compactMascot: v })} />
              <PrefRow
                icon={<Volume2 className="h-4 w-4" />}
                title="Sound Enabled"
                desc="Plays a sound when you earn achievements"
                checked={pref.soundEnabled}
                onChange={(v) => setPref({ soundEnabled: v })}
              />
              <PrefRow
                icon={<Eye className="h-4 w-4" />}
                title="Hide Mascots in Exams"
                desc="Auto-hide mascots inside the Mock Exam and Chapter Test shells"
                checked={pref.hideMascotsInExams}
                onChange={(v) => setPref({ hideMascotsInExams: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MASCOTS */}
        <TabsContent value="mascots" className="space-y-4">
          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Meet Your Learning Companions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(SUBJECT_MASCOTS).map(([key, m]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover-soft card-lift focus-ring"
                    style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${m.color} 6%, transparent), transparent 60%)` }}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="absolute -inset-1 rounded-full opacity-50 blur-sm"
                        style={{ background: m.color }}
                      />
                      <div className="relative">
                        <Mascot mascot={key as 'leo' | 'byte' | 'coda' | 'pico' | 'nova'} state="greeting" size={56} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{m.name}</p>
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPARTMENTS */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                Departments & Syllabus — Cusrow Wadia Institute of Technology
              </CardTitle>
              <CardDescription>
                Explore the official academic departments and core Semester-3 subjects designed for autonomous diploma programs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {CWIT_DEPARTMENTS.map((department) => {
                const Icon = DEPARTMENT_ICONS[department.code] ?? Landmark
                return (
                  <div
                    key={department.code}
                    className={cn(
                      'rounded-2xl border border-border/40 bg-card/40 p-5 shadow-soft relative overflow-hidden group hover:border-primary/30 transition-all duration-300',
                      department.category === 'foundation' && 'md:col-span-2',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${department.accentColor}18`,
                            color: department.accentColor,
                          }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-foreground">{department.name}</h3>
                          <p className="text-meta text-muted-foreground">
                            {department.established ? `Established ${department.established}` : 'Foundation department'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-meta">
                        {department.programme?.intake ? `${department.programme.intake} intake` : department.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{department.summary}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                        <p className="text-meta font-bold uppercase tracking-wider text-primary">Programme</p>
                        <p className="text-xs font-medium mt-1">{department.programme?.name ?? department.shortName}</p>
                        <p className="text-meta text-muted-foreground mt-1">
                          {department.programme?.intakeNote ?? department.programme?.status ?? 'CWIT department'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                        <p className="text-meta font-bold uppercase tracking-wider text-primary">{department.headTitle}</p>
                        <p className="text-xs font-medium mt-1">{department.headName}</p>
                        <a
                          href={department.officialUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-meta text-primary hover:underline"
                        >
                          Official source <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-meta font-bold uppercase tracking-wider text-primary">
                        {department.category === 'foundation' ? 'Foundation Areas' : 'Core Areas'}
                      </p>
                      <ul className="mt-2 grid gap-1 text-xs text-muted-foreground list-disc pl-4 sm:grid-cols-2">
                        {department.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">About Lernio AI 2.0</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Lernio AI 2.0 is a mascot-led adaptive learning platform for diploma engineering students at Cusrow Wadia Institute of Technology (CWIT), Pune.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">2.0.0</p></div>
                <div><p className="text-xs text-muted-foreground">Scheme</p><p className="font-medium">G Scheme 2023</p></div>
                <div><p className="text-xs text-muted-foreground">Semester</p><p className="font-medium">3</p></div>
                <div><p className="text-xs text-muted-foreground">Subjects</p><p className="font-medium">{subjects.length} active</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy &amp; Data</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={exportData}
                disabled={exporting}
              >
                {exporting ? (
                  <><Download className="h-4 w-4 animate-pulse" /> Preparing export…</>
                ) : (
                  <><Download className="h-4 w-4" /> Export My Data</>
                )}
              </Button>
              <p className="text-meta text-muted-foreground px-1">
                Downloads a JSON bundle of your profile, attempts, sessions, achievements, XP ledger, and more.
              </p>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete Account
              </Button>
              <p className="text-meta text-muted-foreground px-1">
                Permanently deletes all your data. This cannot be undone.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Subject Mascot Guide</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <p><strong>LEO</strong> — Your main companion. Appears in onboarding, dashboard, and AI Tutor.</p>
                <p><strong>Byte</strong> — Data Structures guide. Helps in the DS visualizer lab.</p>
                <p><strong>Coda</strong> — C++ coding companion. Reacts to your code submissions.</p>
                <p><strong>Pico</strong> — Microprocessors mentor. Explains 8086 register changes.</p>
                <p><strong>Nova</strong> — Data Communication guide. Helps with signal visualizations.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog — requires typing DELETE */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirmText('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete account permanently
            </DialogTitle>
            <DialogDescription>
              This permanently deletes all your data — profile, lesson completions, attempts,
              tutor sessions, coding submissions, achievements, XP history, contributions, and bookmarks.
              <strong className="block mt-2 text-destructive">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Type DELETE to confirm</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="gap-2"
            >
              {deleting ? (
                <><Trash2 className="h-4 w-4 animate-pulse" /> Deleting…</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Delete forever</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrefRow({ icon, title, desc, checked, onChange }: {
  icon: React.ReactNode
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-meta text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  )
}
