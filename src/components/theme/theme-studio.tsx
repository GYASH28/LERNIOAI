'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Battery,
  Check,
  Contrast,
  Download,
  Gauge,
  Layers,
  Monitor,
  Moon,
  Palette,
  Play,
  RotateCcw,
  Sparkle,
  Sun,
  Upload,
  Waves,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePrefs } from '@/components/theme-provider'
import { useThemeSwitchTransition } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PALETTES, type ThemePrefUpdate } from '@/lib/theme-types'
import { exportThemePreferences, importThemePreferences } from '@/lib/theme-preferences'
import { getThemeMotion } from '@/lib/motion/theme-motion'
import { cn } from '@/lib/utils'

function readContrastRatio(foreground: string, background: string): string {
  const fg = readOklchLightness(foreground)
  const bg = readOklchLightness(background)
  if (fg === null || bg === null) return 'n/a'
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return `${((lighter + 0.05) / (darker + 0.05)).toFixed(1)}:1`
}

function readOklchLightness(value: string): number | null {
  const match = value.match(/oklch\(([\d.]+)/)
  return match?.[1] ? Number(match[1]) : null
}

export function ThemeStudio() {
  const { pref, setPref } = usePrefs()
  const applyTheme = useThemeSwitchTransition(setPref)
  const [importText, setImportText] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  const activePalette = PALETTES.find((palette) => palette.id === pref.palette) ?? PALETTES[0]
  const activeSignature = getThemeMotion(pref.palette)
  const exported = useMemo(() => exportThemePreferences(pref), [pref])

  const apply = (update: ThemePrefUpdate) => applyTheme(update)

  const copyExport = async () => {
    await navigator.clipboard.writeText(exported)
    toast.success('Theme preferences copied.')
  }

  const importPrefs = () => {
    const result = importThemePreferences(importText)
    if (!result.ok) {
      toast.error(result.errors[0] ?? 'Invalid theme preferences.')
      return
    }
    setPref(result.value)
    toast.success('Theme preferences imported.')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <div className="space-y-4">
        <Card surface="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              Theme Studio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block text-sm">Appearance</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'light' as const, label: 'Light', icon: Sun },
                  { v: 'dark' as const, label: 'Dark', icon: Moon },
                  { v: 'system' as const, label: 'System', icon: Monitor },
                ]).map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.v}
                      onClick={() => apply({ appearance: item.v })}
                      className={cn(
                        'flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors',
                        pref.appearance === item.v ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2 text-sm">
                <Waves className="h-4 w-4" />
                Palette and Motion Signature
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PALETTES.map((palette) => {
                  const signature = getThemeMotion(palette.id)
                  const active = pref.palette === palette.id
                  return (
                    <button
                      key={palette.id}
                      onClick={() => apply({ palette: palette.id })}
                      className={cn(
                        'relative rounded-xl border-2 p-3 text-left transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
                      )}
                    >
                      <div className="mb-3 flex gap-1.5">
                        {(['canvas', 'surface', 'brand', 'accent'] as const).map((key) => (
                          <span
                            key={key}
                            className="h-7 flex-1 rounded-md border border-black/5"
                            style={{ background: palette.swatches[key] }}
                          />
                        ))}
                      </div>
                      <div className="theme-card-signature" data-signature={signature.atmosphere.kind} />
                      <p className="mt-3 text-sm font-semibold leading-tight">{palette.name}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{palette.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {signature.atmosphere.kind}
                        </Badge>
                        {palette.darkFirst && <Badge variant="secondary" className="text-xs">Dark-first</Badge>}
                      </div>
                      {active && (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OptionGroup
                icon={<Contrast className="h-4 w-4" />}
                label="Contrast"
                value={pref.contrast}
                options={[
                  ['normal', 'Normal'],
                  ['high', 'High'],
                ]}
                onChange={(contrast) => apply({ contrast: contrast as ThemePrefUpdate['contrast'] })}
              />
              <OptionGroup
                icon={<Gauge className="h-4 w-4" />}
                label="Density"
                value={pref.density}
                options={[
                  ['comfortable', 'Comfortable'],
                  ['compact', 'Compact'],
                ]}
                onChange={(density) => apply({ density: density as ThemePrefUpdate['density'] })}
              />
              <OptionGroup
                icon={<Layers className="h-4 w-4" />}
                label="Surface"
                value={pref.surfaceStyle}
                options={[
                  ['flat', 'Flat'],
                  ['soft', 'Soft'],
                  ['glass', 'Glass'],
                ]}
                onChange={(surfaceStyle) => apply({ surfaceStyle: surfaceStyle as ThemePrefUpdate['surfaceStyle'] })}
              />
              <OptionGroup
                icon={<Sparkle className="h-4 w-4" />}
                label="Subject Tint"
                value={pref.subjectTint}
                options={[
                  ['off', 'Off'],
                  ['subtle', 'Subtle'],
                  ['strong', 'Strong'],
                ]}
                onChange={(subjectTint) => apply({ subjectTint: subjectTint as ThemePrefUpdate['subjectTint'] })}
              />
            </div>

            <OptionGroup
              icon={<Play className="h-4 w-4" />}
              label="Motion"
              value={pref.motion}
              options={[
                ['full', 'Full'],
                ['reduced', 'Reduced'],
                ['none', 'None'],
              ]}
              onChange={(motion) => apply({ motion: motion as ThemePrefUpdate['motion'] })}
            />

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Low Power</p>
                  <p className="text-xs text-muted-foreground">Disables blur, ambient motion, chart tweening, and mascot loops.</p>
                </div>
              </div>
              <Button
                variant={pref.lowPower ? 'default' : 'outline'}
                onClick={() => apply({ lowPower: !pref.lowPower })}
              >
                {pref.lowPower ? 'Enabled' : 'Enable'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-primary" />
              Import and Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={exported}
              className="min-h-28 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyExport} className="gap-2">
                <Download className="h-4 w-4" />
                Copy Export
              </Button>
              <Button variant="outline" onClick={importPrefs} className="gap-2">
                <Upload className="h-4 w-4" />
                Import JSON
              </Button>
              <Button variant="outline" onClick={() => setPref({ palette: 'aurora', surfaceStyle: 'soft', motion: 'full', lowPower: false })} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Theme
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card surface="elevated">
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="theme-studio-preview" data-palette-preview={pref.palette}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{activePalette.name}</p>
                  <p className="text-xs text-muted-foreground">Dashboard, lesson, tutor, chart, and mascot samples.</p>
                </div>
                <Badge className="capitalize">{activeSignature.atmosphere.kind}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-medium">Continue Learning</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A quiet lesson surface with stable body text and theme-aware accents.</p>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 w-2/3 rounded-full bg-primary progress-shimmer" />
                  </div>
                </div>
                <div data-subject="data-structures" className="rounded-lg border border-border p-3">
                  <p className="subject-tint-target text-sm font-medium">Data Structures Practice</p>
                  <p className="mt-1 text-xs text-muted-foreground">Subject Tint is visible here without recolouring body text.</p>
                </div>
                <div className="grid grid-cols-5 items-end gap-2 rounded-lg border border-border p-3">
                  {[28, 48, 34, 66, 52].map((height, index) => (
                    <span
                      key={index}
                      className="rounded-t bg-primary/80"
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motion Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div key={previewKey} className="theme-motion-preview" data-signature={activeSignature.atmosphere.kind}>
              <span />
              <span />
              <span />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setPreviewKey((key) => key + 1)} className="gap-2">
                <Play className="h-4 w-4" />
                Replay
              </Button>
              <Badge variant="outline">Disabled in exams</Badge>
              <Badge variant="outline">Low Power fallback</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contrast Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <ContrastRow label="Body text" ratio={readContrastRatio(activePalette.swatches.brand, activePalette.swatches.canvas)} />
            <ContrastRow label="Surface text" ratio={readContrastRatio(activePalette.swatches.brand, activePalette.swatches.surface)} />
            <ContrastRow label="Primary button" ratio={readContrastRatio(activePalette.swatches.canvas, activePalette.swatches.brand)} />
            <p className="text-xs text-muted-foreground">High Contrast mode strengthens borders, focus rings, and surface separation across all palettes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OptionGroup({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label className="mb-2 flex items-center gap-2 text-sm">{icon}{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            onClick={() => onChange(optionValue)}
            className={cn(
              'min-h-9 flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
              value === optionValue ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/40',
            )}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  )
}

function ContrastRow({ label, ratio }: { label: string; ratio: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span>{label}</span>
      <span className="font-mono text-sm font-semibold">{ratio}</span>
    </div>
  )
}
