'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Radio, Layers, Waves, Network, RotateCcw, CheckCircle2, XCircle,
  Zap, Clock, Activity,
} from 'lucide-react'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'

// ===========================================================================
// Shared SVG helpers
// ===========================================================================
const W = 560
const H = 200
const MID = H / 2

function sinePath(freq: number, amp: number, phaseDeg: number, width = W, height = H): string {
  const points: string[] = []
  const ampPx = (amp * height) / 14
  const phaseRad = (phaseDeg * Math.PI) / 180
  for (let x = 0; x <= width; x += 2) {
    const t = (x / width) * 2 * Math.PI * freq
    const y = height / 2 - ampPx * Math.sin(t + phaseRad)
    points.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return points.join(' ')
}

function squarePath(freq: number, amp: number, phaseDeg: number, width = W, height = H): string {
  const period = width / freq
  const phaseShift = (phaseDeg / 360) * period
  const ampPx = (amp * height) / 14
  const highY = height / 2 - ampPx
  const lowY = height / 2 + ampPx
  let path = ''
  let prevY: number | null = null
  for (let x = 0; x <= width; x += 1) {
    const phaseX = (((x + phaseShift) % period) + period) % period
    const y = phaseX < period / 2 ? highY : lowY
    if (x === 0) {
      path = `M ${x} ${y}`
    } else if (prevY !== null && prevY !== y) {
      path += ` L ${x} ${prevY} L ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
    }
    prevY = y
  }
  return path
}

// ===========================================================================
// 1. Signal Types
// ===========================================================================
function SignalTypesModule() {
  const [kind, setKind] = useState<'analog' | 'digital'>('analog')
  const [amplitude, setAmplitude] = useState(3)
  const [frequency, setFrequency] = useState(4)
  const [phase, setPhase] = useState(0)

  const path = kind === 'analog'
    ? sinePath(frequency, amplitude, phase)
    : squarePath(frequency, amplitude, phase)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
          <button
            onClick={() => setKind('analog')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              kind === 'analog' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Analog
          </button>
          <button
            onClick={() => setKind('digital')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              kind === 'digital' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Digital
          </button>
        </div>
        <Badge variant="outline" className="text-meta">
          {kind === 'analog' ? 'Continuous sine wave' : 'Discrete 0/1 levels'}
        </Badge>
      </div>

      <Card className="border-emerald-500/20">
        <CardContent className="pt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48 bg-muted/20 rounded-lg border border-border">
            <line x1="0" y1={MID} x2={W} y2={MID} stroke="currentColor" className="text-border" strokeDasharray="3 3" />
            <motion.path
              key={`${kind}-${amplitude}-${frequency}-${phase}`}
              d={path}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
            {/* Axes labels */}
            <text x="6" y="14" className="fill-muted-foreground" fontSize="10">amp</text>
            <text x={W - 30} y={H - 6} className="fill-muted-foreground" fontSize="10">time →</text>
          </svg>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Amplitude</Label>
            <span className="text-xs text-muted-foreground">{amplitude}</span>
          </div>
          <Slider value={[amplitude]} min={1} max={5} step={1} onValueChange={(v) => setAmplitude(v[0])} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Frequency</Label>
            <span className="text-xs text-muted-foreground">{frequency} Hz</span>
          </div>
          <Slider value={[frequency]} min={1} max={10} step={1} onValueChange={(v) => setFrequency(v[0])} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Phase</Label>
            <span className="text-xs text-muted-foreground">{phase}°</span>
          </div>
          <Slider value={[phase]} min={0} max={360} step={15} onValueChange={(v) => setPhase(v[0])} />
        </div>
      </div>

      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">What am I looking at?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {kind === 'analog'
            ? 'An analog signal is a continuous wave that varies smoothly over time. Real-world examples: voice, temperature, music. The three parameters — amplitude (height), frequency (cycles per second), and phase (offset) — fully describe a sine wave.'
            : 'A digital signal has only two voltage levels: HIGH (1) and LOW (0). Computers use digital signals because they are immune to noise and easy to store. Frequency here controls how many pulses appear per unit time.'}
        </p>
      </div>
    </div>
  )
}

// ===========================================================================
// 2. OSI Model + matching game
// ===========================================================================
interface OSILayer {
  num: number
  name: string
  function: string
  protocols: string[]
  dataUnit: string
  color: string
}

const OSI_LAYERS: OSILayer[] = [
  { num: 7, name: 'Application', function: 'Network services for end-user applications', protocols: ['HTTP', 'FTP', 'SMTP', 'DNS'], dataUnit: 'Data', color: '#ef4444' },
  { num: 6, name: 'Presentation', function: 'Translation, encryption, compression', protocols: ['SSL/TLS', 'JPEG', 'MPEG', 'ASCII'], dataUnit: 'Data', color: '#f97316' },
  { num: 5, name: 'Session', function: 'Establishes, manages, terminates sessions', protocols: ['NetBIOS', 'RPC', 'SIP'], dataUnit: 'Data', color: '#f59e0b' },
  { num: 4, name: 'Transport', function: 'Reliable end-to-end delivery & flow control', protocols: ['TCP', 'UDP'], dataUnit: 'Segments', color: '#84cc16' },
  { num: 3, name: 'Network', function: 'Routing & logical addressing', protocols: ['IP', 'ICMP', 'ARP'], dataUnit: 'Packets', color: '#10b981' },
  { num: 2, name: 'Data Link', function: 'Framing, MAC addressing, error detection', protocols: ['Ethernet', 'PPP', 'MAC'], dataUnit: 'Frames', color: '#06b6d4' },
  { num: 1, name: 'Physical', function: 'Transmission of raw bits over media', protocols: ['Cables', 'Hubs', 'Radio'], dataUnit: 'Bits', color: '#6366f1' },
]

// Matching game: one protocol per layer
const MATCH_PROTOCOLS: { layer: number; name: string }[] = [
  { layer: 7, name: 'HTTP' },
  { layer: 6, name: 'JPEG' },
  { layer: 5, name: 'RPC' },
  { layer: 4, name: 'TCP' },
  { layer: 3, name: 'IP' },
  { layer: 2, name: 'Ethernet' },
  { layer: 1, name: 'Hubs' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function OSIModelModule() {
  const [selectedLayer, setSelectedLayer] = useState<OSILayer>(OSI_LAYERS[0])
  const [assignments, setAssignments] = useState<Record<number, string | null>>({ 7: null, 6: null, 5: null, 4: null, 3: null, 2: null, 1: null })
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
  const [pool, setPool] = useState<string[]>(() => shuffle(MATCH_PROTOCOLS.map((p) => p.name)))
  const [checked, setChecked] = useState(false)

  const correctCount = OSI_LAYERS.filter((l) => assignments[l.num] === MATCH_PROTOCOLS.find((p) => p.layer === l.num)?.name).length
  const allAssigned = OSI_LAYERS.every((l) => assignments[l.num] !== null)

  const reset = () => {
    setAssignments({ 7: null, 6: null, 5: null, 4: null, 3: null, 2: null, 1: null })
    setSelectedProtocol(null)
    setChecked(false)
    setPool(shuffle(MATCH_PROTOCOLS.map((p) => p.name)))
  }

  const handleProtocolClick = (name: string) => {
    setSelectedProtocol((p) => (p === name ? null : name))
  }

  const handleLayerClick = (layer: OSILayer) => {
    setSelectedLayer(layer)
    if (!selectedProtocol) return
    // remove this protocol from any other layer it might be assigned to
    setAssignments((prev) => {
      const next = { ...prev }
      // remove from any layer that has it
      for (const k of Object.keys(next)) {
        if (next[+k] === selectedProtocol) next[+k] = null
      }
      next[layer.num] = selectedProtocol
      return next
    })
    setPool((p) => p.filter((x) => x !== selectedProtocol))
    setSelectedProtocol(null)
    setChecked(false)
  }

  const handleAssignedClick = (layer: OSILayer) => {
    const name = assignments[layer.num]
    if (!name) return
    setAssignments((prev) => ({ ...prev, [layer.num]: null }))
    setPool((p) => [...p, name])
    setChecked(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-layer stack */}
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">The 7 Layers</CardTitle>
            <CardDescription className="text-xs">Click any layer to learn more. Top = user, bottom = wire.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {OSI_LAYERS.map((layer) => {
              const assigned = assignments[layer.num]
              const isCorrect = checked && assigned === MATCH_PROTOCOLS.find((p) => p.layer === layer.num)?.name
              const isWrong = checked && assigned !== null && assigned !== MATCH_PROTOCOLS.find((p) => p.layer === layer.num)?.name
              return (
                <motion.button
                  key={layer.num}
                  onClick={() => handleLayerClick(layer)}
                  onDoubleClick={() => assigned && handleAssignedClick(layer)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all border',
                    selectedLayer.num === layer.num
                      ? 'ring-2 ring-emerald-500/50 border-emerald-500/40'
                      : 'border-border hover:border-emerald-500/30',
                  )}
                  style={{ backgroundColor: `${layer.color}12` }}
                >
                  <span
                    className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: layer.color }}
                  >
                    {layer.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: layer.color }}>{layer.name}</p>
                    <p className="text-meta text-muted-foreground truncate">{layer.dataUnit}</p>
                  </div>
                  {assigned ? (
                    <Badge
                      className={cn(
                        'text-meta gap-1',
                        isCorrect && 'bg-emerald-500 text-white',
                        isWrong && 'bg-red-500 text-white',
                        !checked && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      {isCorrect && <CheckCircle2 className="h-3 w-3" />}
                      {isWrong && <XCircle className="h-3 w-3" />}
                      {assigned}
                    </Badge>
                  ) : (
                    <span className="text-meta text-muted-foreground/50 italic">{selectedProtocol ? '← assign' : 'empty'}</span>
                  )}
                </motion.button>
              )
            })}
          </CardContent>
        </Card>

        {/* Details + Game */}
        <div className="space-y-4">
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-7 w-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: selectedLayer.color }}
                >
                  {selectedLayer.num}
                </span>
                <CardTitle className="text-sm">Layer {selectedLayer.num}: {selectedLayer.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">Function</p>
                <p className="mt-0.5">{selectedLayer.function}</p>
              </div>
              <div>
                <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">Data Unit</p>
                <p className="mt-0.5 font-mono text-xs">{selectedLayer.dataUnit}</p>
              </div>
              <div>
                <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">Example Protocols</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedLayer.protocols.map((p) => (
                    <Badge key={p} variant="outline" className="text-meta">{p}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Matching Game</CardTitle>
                {checked && (
                  <Badge className={cn('text-meta', correctCount === 7 ? 'bg-emerald-500' : 'bg-amber-500', 'text-white')}>
                    {correctCount} / 7 correct
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">Click a protocol, then click a layer to assign it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                {pool.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">All protocols assigned. Click "Check" to score.</p>
                ) : (
                  pool.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleProtocolClick(name)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                        selectedProtocol === name
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-muted/40 hover:bg-muted border-border'
                      )}
                    >
                      {name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChecked(true)}
                  disabled={!allAssigned}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Check Answers
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
              {checked && correctCount === 7 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Perfect! You matched every protocol to its layer.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// 3. Modulation Types
// ===========================================================================
function modulationPaths(type: 'AM' | 'FM' | 'PM') {
  const width = W
  const height = 110
  const mid = height / 2
  const carrierFreq = 12
  const carrierAmp = 30
  const msgFreq = 1.5
  const msgAmp = 25

  // Carrier wave
  const carrier: string[] = []
  for (let x = 0; x <= width; x += 2) {
    const t = (x / width) * 2 * Math.PI * carrierFreq
    const y = mid - carrierAmp * Math.sin(t)
    carrier.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  // Message signal
  const message: string[] = []
  for (let x = 0; x <= width; x += 2) {
    const t = (x / width) * 2 * Math.PI * msgFreq
    const y = mid - msgAmp * Math.sin(t)
    message.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  // Modulated
  const modulated: string[] = []
  for (let x = 0; x <= width; x += 1) {
    const t = (x / width) * 2 * Math.PI * msgFreq
    const tc = (x / width) * 2 * Math.PI * carrierFreq
    const msg = Math.sin(t)
    let y: number
    if (type === 'AM') {
      const env = 1 + 0.6 * msg
      y = mid - carrierAmp * env * Math.sin(tc)
    } else if (type === 'FM') {
      // instantaneous frequency modulated by message
      const k = 4
      y = mid - carrierAmp * Math.sin(tc + k * msg)
    } else {
      // PM
      const beta = 2
      y = mid - carrierAmp * Math.sin(tc + beta * msg)
    }
    modulated.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  return { carrier: carrier.join(' '), message: message.join(' '), modulated: modulated.join(' '), height }
}

function ModulationModule() {
  const [type, setType] = useState<'AM' | 'FM' | 'PM'>('AM')
  const paths = useMemo(() => modulationPaths(type), [type])

  const desc: Record<'AM' | 'FM' | 'PM', { name: string; full: string; def: string }> = {
    AM: { name: 'Amplitude Modulation', full: 'AM', def: 'The amplitude of the carrier wave varies in proportion to the message signal. Frequency and phase remain constant.' },
    FM: { name: 'Frequency Modulation', full: 'FM', def: 'The frequency of the carrier wave varies with the message signal. Amplitude stays constant — FM is more immune to noise.' },
    PM: { name: 'Phase Modulation', full: 'PM', def: 'The phase of the carrier wave is shifted by the message signal. Closely related to FM; both are angle modulations.' },
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
        {(['AM', 'FM', 'PM'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'px-4 py-1.5 rounded text-xs font-medium transition-colors',
              type === t ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <WaveCard title="Carrier Wave" subtitle="High-frequency reference" color="#06b6d4" path={paths.carrier} height={paths.height} />
        <WaveCard title="Message Signal" subtitle="The information to send" color="#f59e0b" path={paths.message} height={paths.height} />
        <WaveCard title={`Modulated (${type})`} subtitle="What gets transmitted" color="#10b981" path={paths.modulated} height={paths.height} highlight />
      </div>

      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">{desc[type].name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc[type].def}</p>
      </div>
    </div>
  )
}

function WaveCard({ title, subtitle, color, path, height, highlight }: { title: string; subtitle: string; color: string; path: string; height: number; highlight?: boolean }) {
  return (
    <Card className={cn('border-emerald-500/20', highlight && 'ring-1 ring-emerald-500/30')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {title}
        </CardTitle>
        <CardDescription className="text-meta">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-24 bg-muted/20 rounded-md border border-border">
          <line x1="0" y1={height / 2} x2={W} y2={height / 2} stroke="currentColor" className="text-border" strokeDasharray="2 3" />
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        </svg>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// 4. Packet Switching vs Circuit Switching
// ===========================================================================
interface Node { id: string; x: number; y: number; label: string }

const CIRCUIT_PATH: Node[] = [
  { id: 'src', x: 30, y: 60, label: 'A' },
  { id: 'n1', x: 130, y: 30, label: 'B' },
  { id: 'n2', x: 230, y: 30, label: 'C' },
  { id: 'n3', x: 330, y: 60, label: 'D' },
  { id: 'dst', x: 430, y: 60, label: 'E' },
]

const PACKET_PATHS: Node[][] = [
  [
    { id: 'src', x: 30, y: 60, label: 'A' },
    { id: 'n1', x: 130, y: 30, label: 'B' },
    { id: 'n2', x: 230, y: 30, label: 'C' },
    { id: 'dst', x: 430, y: 60, label: 'E' },
  ],
  [
    { id: 'src', x: 30, y: 60, label: 'A' },
    { id: 'nb', x: 130, y: 90, label: 'F' },
    { id: 'nb2', x: 230, y: 90, label: 'G' },
    { id: 'dst', x: 430, y: 60, label: 'E' },
  ],
  [
    { id: 'src', x: 30, y: 60, label: 'A' },
    { id: 'n1', x: 130, y: 30, label: 'B' },
    { id: 'nb2', x: 230, y: 90, label: 'G' },
    { id: 'dst', x: 430, y: 60, label: 'E' },
  ],
]

function SwitchingModule() {
  const [tick, setTick] = useState(0)
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    rafRef.current = setInterval(() => setTick((t) => t + 1), 80)
    return () => {
      if (rafRef.current) clearInterval(rafRef.current)
    }
  }, [])

  // Circuit: one dot moving along fixed path
  const circuitT = (tick % 60) / 60
  const circuitPos = posAlong(CIRCUIT_PATH, circuitT)

  // Packet: 3 packets, each on its own path with offsets
  const packetPositions = PACKET_PATHS.map((p, i) => {
    const t = ((tick / 40 + i * 0.33) % 1)
    return posAlong(p, t)
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Circuit Switching */}
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Circuit Switching
              </CardTitle>
              <Badge variant="outline" className="text-meta">Dedicated path</Badge>
            </div>
            <CardDescription className="text-xs">A fixed connection is established before data is sent and held for the session.</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 460 120" className="w-full h-32 bg-muted/20 rounded-md border border-border">
              {/* All possible links in faded gray */}
              <line x1="30" y1="60" x2="130" y2="30" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="130" y1="30" x2="230" y2="30" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="230" y1="30" x2="330" y2="60" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="330" y1="60" x2="430" y2="60" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="30" y1="60" x2="130" y2="90" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="130" y1="90" x2="230" y2="90" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="230" y1="90" x2="330" y2="60" stroke="currentColor" className="text-border" strokeWidth="1" />
              {/* Active path highlighted */}
              <polyline
                points={CIRCUIT_PATH.map((n) => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Nodes */}
              {CIRCUIT_PATH.map((n) => (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r="10" fill="white" stroke="#10b981" strokeWidth="2" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#10b981">{n.label}</text>
                </g>
              ))}
              {/* Moving dot */}
              <circle cx={circuitPos.x} cy={circuitPos.y} r="6" fill="#10b981">
                <animate attributeName="r" values="6;8;6" dur="0.6s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 text-meta">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Guaranteed bandwidth</span>
              </div>
              <div className="flex items-start gap-1.5">
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Wastes idle capacity</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Constant delay</span>
              </div>
              <div className="flex items-start gap-1.5">
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Setup time needed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packet Switching */}
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="h-4 w-4 text-emerald-500" />
                Packet Switching
              </CardTitle>
              <Badge variant="outline" className="text-meta">Routed per packet</Badge>
            </div>
            <CardDescription className="text-xs">Data is broken into packets; each can take a different route to the destination.</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 460 120" className="w-full h-32 bg-muted/20 rounded-md border border-border">
              {/* All links */}
              <line x1="30" y1="60" x2="130" y2="30" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="130" y1="30" x2="230" y2="30" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="230" y1="30" x2="430" y2="60" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="30" y1="60" x2="130" y2="90" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="130" y1="90" x2="230" y2="90" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="230" y1="90" x2="430" y2="60" stroke="currentColor" className="text-border" strokeWidth="1" />
              <line x1="130" y1="30" x2="230" y2="90" stroke="currentColor" className="text-border" strokeWidth="1" />

              {/* All unique nodes */}
              {[
                { x: 30, y: 60, label: 'A' },
                { x: 130, y: 30, label: 'B' },
                { x: 230, y: 30, label: 'C' },
                { x: 130, y: 90, label: 'F' },
                { x: 230, y: 90, label: 'G' },
                { x: 430, y: 60, label: 'E' },
              ].map((n) => (
                <g key={`${n.label}`}>
                  <circle cx={n.x} cy={n.y} r="10" fill="white" stroke="#10b981" strokeWidth="2" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#10b981">{n.label}</text>
                </g>
              ))}

              {/* Packets */}
              {packetPositions.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill={['#10b981', '#06b6d4', '#f59e0b'][i]} opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.5s" repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 text-meta">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Efficient use of links</span>
              </div>
              <div className="flex items-start gap-1.5">
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Variable delay</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">No setup needed</span>
              </div>
              <div className="flex items-start gap-1.5">
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Packets may reorder</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Real-world examples</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p><strong className="text-foreground">Circuit:</strong> Traditional telephone networks (PSTN). A copper path is reserved for your call.</p>
          <p><strong className="text-foreground">Packet:</strong> The Internet (IP). Every email, video, and web page is broken into packets and reassembled at the destination.</p>
        </div>
      </div>
    </div>
  )
}

function posAlong(path: Node[], t: number): { x: number; y: number } {
  if (path.length < 2) return { x: 0, y: 0 }
  const segs = path.length - 1
  const segT = t * segs
  const idx = Math.min(Math.floor(segT), segs - 1)
  const localT = segT - idx
  const a = path[idx]
  const b = path[idx + 1]
  return { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT }
}

// ===========================================================================
// Main DC Lab component
// ===========================================================================
const MODULES = [
  { key: 'signal', label: 'Signal Types', icon: Waves, desc: 'Analog & digital waves' },
  { key: 'osi', label: 'OSI Model', icon: Layers, desc: '7-layer stack + game' },
  { key: 'modulation', label: 'Modulation', icon: Radio, desc: 'AM, FM, PM' },
  { key: 'switching', label: 'Switching', icon: Network, desc: 'Packet vs Circuit' },
] as const

export function DataCommunicationLab() {
  const [active, setActive] = useState<string>('signal')
  const mascotMsg: Record<string, string> = {
    signal: "I'm Nova! Adjust the sliders and watch the waveform change in real time. Try toggling analog ↔ digital!",
    osi: 'The OSI model has 7 layers — each with a job. Click a layer to learn it, then play the matching game.',
    modulation: 'Modulation lets us ride a message signal on a carrier wave. Compare AM, FM and PM here.',
    switching: 'Circuit vs Packet — the two ways networks route data. Watch the dots move to see the difference.',
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Data Communication Visual Lab
          </CardTitle>
          <CardDescription>Four interactive modules covering signals, OSI, modulation, and switching.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MODULES.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all',
                    active === m.key
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
                  )}
                >
                  <Icon className={cn('h-5 w-5', active === m.key ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-meta text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {active === 'signal' && <SignalTypesModule />}
          {active === 'osi' && <OSIModelModule />}
          {active === 'modulation' && <ModulationModule />}
          {active === 'switching' && <SwitchingModule />}
        </motion.div>
      </AnimatePresence>

      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3">
        <Mascot mascot="nova" state="explaining" size={56} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Nova says:</p>
          <p className="text-sm mt-0.5 leading-relaxed">{mascotMsg[active]}</p>
        </div>
      </div>
    </div>
  )
}
