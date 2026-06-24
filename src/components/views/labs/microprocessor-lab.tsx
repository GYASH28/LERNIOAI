'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Cpu, Play, Square, SkipForward, RotateCcw, FileCode2, AlertTriangle,
  CheckCircle2, Terminal, BookOpen,
} from 'lucide-react'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Instruction {
  lineNum: number
  op: string
  args: string[]
  raw: string
}

interface ParseResult {
  instructions: Instruction[]
  labels: Record<string, number>
  errors: { line: number; msg: string }[]
}

interface CPUState {
  AX: number
  BX: number
  CX: number
  DX: number
  IP: number
  CF: boolean
  ZF: boolean
  SF: boolean
  OF: boolean
  memory: Map<number, number>
  halted: boolean
}

interface LogEntry {
  step: number
  raw: string
  effect: string
  state: string
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
const VALID_OPS = new Set([
  'MOV', 'ADD', 'SUB', 'MUL', 'INC', 'DEC', 'CMP',
  'JMP', 'JE', 'JNE', 'JNZ', 'JG', 'JL', 'HLT', 'NOP',
])

function parse(code: string): ParseResult {
  const lines = code.split('\n')
  const instructions: Instruction[] = []
  const labels: Record<string, number> = {}
  const errors: { line: number; msg: string }[] = []
  const pendingLabels: string[] = []

  lines.forEach((raw, idx) => {
    const lineNum = idx + 1
    let line = raw.split(';')[0].trim()
    if (!line) return

    // Extract optional label "NAME: rest"
    const labelMatch = line.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/)
    if (labelMatch) {
      const labelName = labelMatch[1].toUpperCase()
      if (labels[labelName] !== undefined) {
        errors.push({ line: lineNum, msg: `Duplicate label: ${labelName}` })
      } else {
        pendingLabels.push(labelName)
      }
      line = labelMatch[2].trim()
      if (!line) return
    }

    const sp = line.indexOf(' ')
    const op = (sp === -1 ? line : line.slice(0, sp)).toUpperCase()
    const rest = sp === -1 ? '' : line.slice(sp + 1).trim()
    const args = rest ? rest.split(',').map((a) => a.trim()).filter(Boolean) : []

    if (!VALID_OPS.has(op)) {
      errors.push({ line: lineNum, msg: `Unknown instruction: "${op}"` })
      return
    }

    const instIdx = instructions.length
    pendingLabels.forEach((l) => { labels[l] = instIdx })
    pendingLabels.length = 0

    instructions.push({ lineNum, op, args, raw: line })
  })

  // Pending labels pointing past end → point to end (HLT-like)
  pendingLabels.forEach((l) => { labels[l] = instructions.length })

  return { instructions, labels, errors }
}

// ---------------------------------------------------------------------------
// CPU
// ---------------------------------------------------------------------------
const REGS = ['AX', 'BX', 'CX', 'DX'] as const
type RegName = (typeof REGS)[number]

function createCPU(): CPUState {
  return {
    AX: 0, BX: 0, CX: 0, DX: 0, IP: 0,
    CF: false, ZF: false, SF: false, OF: false,
    memory: new Map(), halted: false,
  }
}

function getReg(cpu: CPUState, name: string): number | null {
  const n = name.toUpperCase()
  return (REGS as readonly string[]).includes(n) ? cpu[n as RegName] : null
}

function setReg(cpu: CPUState, name: string, value: number) {
  const n = name.toUpperCase()
  if ((REGS as readonly string[]).includes(n)) {
    cpu[n as RegName] = value & 0xFFFF
  }
}

function parseImm(token: string): number | null {
  const t = token.trim().toUpperCase()
  if (/^[0-9]+$/.test(t)) return parseInt(t, 10)
  if (/^[0-9A-F]+H$/.test(t)) return parseInt(t.slice(0, -1), 16)
  if (t.startsWith('0X') && /^[0-9A-F]+$/.test(t.slice(2))) return parseInt(t.slice(2), 16)
  return null
}

function resolveAddr(token: string, cpu: CPUState): number {
  const inner = token.trim()
  const regVal = getReg(cpu, inner)
  if (regVal !== null) return regVal & 0xFFFF
  const imm = parseImm(inner)
  return imm !== null ? imm & 0xFFFF : 0
}

function resolveSrc(token: string, cpu: CPUState): number {
  const t = token.trim()
  if (t.startsWith('[') && t.endsWith(']')) {
    const addr = resolveAddr(t.slice(1, -1), cpu)
    return cpu.memory.get(addr) || 0
  }
  const regVal = getReg(cpu, t)
  if (regVal !== null) return regVal
  const imm = parseImm(t)
  return imm !== null ? imm : 0
}

function assignDest(token: string, value: number, cpu: CPUState) {
  const t = token.trim()
  if (t.startsWith('[') && t.endsWith(']')) {
    const addr = resolveAddr(t.slice(1, -1), cpu)
    cpu.memory.set(addr, value & 0xFFFF)
    return
  }
  setReg(cpu, t, value)
}

function setFlagsArith(cpu: CPUState, a: number, b: number, result: number, isSub: boolean) {
  const masked = result & 0xFFFF
  cpu.ZF = masked === 0
  cpu.SF = (masked & 0x8000) !== 0
  cpu.CF = isSub ? (result < 0) : (result > 0xFFFF)
  // Signed overflow detection
  const sa = (a & 0x8000) !== 0
  const sb = (b & 0x8000) !== 0
  const sr = (masked & 0x8000) !== 0
  cpu.OF = isSub ? (sa !== sb && sa !== sr) : (sa === sb && sa !== sr)
}

function executeOne(inst: Instruction, cpu: CPUState, labels: Record<string, number>): { log: string } {
  const { op, args } = inst
  let jumped = false
  let log = ''

  switch (op) {
    case 'MOV': {
      const v = resolveSrc(args[1], cpu)
      assignDest(args[0], v, cpu)
      log = `${args[0]} ← ${v}`
      break
    }
    case 'ADD': {
      const a = resolveSrc(args[0], cpu)
      const b = resolveSrc(args[1], cpu)
      const result = a + b
      assignDest(args[0], result, cpu)
      setFlagsArith(cpu, a, b, result, false)
      log = `${args[0]} ← ${a} + ${b} = ${result & 0xFFFF}`
      break
    }
    case 'SUB': {
      const a = resolveSrc(args[0], cpu)
      const b = resolveSrc(args[1], cpu)
      const result = a - b
      assignDest(args[0], result, cpu)
      setFlagsArith(cpu, a, b, result, true)
      log = `${args[0]} ← ${a} - ${b} = ${result & 0xFFFF}`
      break
    }
    case 'MUL': {
      const src = resolveSrc(args[0], cpu)
      const result = (cpu.AX * src) & 0xFFFF
      cpu.AX = result
      cpu.ZF = result === 0
      cpu.SF = (result & 0x8000) !== 0
      log = `AX ← AX × ${src} = ${result}`
      break
    }
    case 'INC': {
      const a = resolveSrc(args[0], cpu)
      const result = a + 1
      assignDest(args[0], result, cpu)
      const masked = result & 0xFFFF
      cpu.ZF = masked === 0
      cpu.SF = (masked & 0x8000) !== 0
      log = `${args[0]} ← ${a} + 1 = ${masked}`
      break
    }
    case 'DEC': {
      const a = resolveSrc(args[0], cpu)
      const result = a - 1
      assignDest(args[0], result, cpu)
      const masked = result & 0xFFFF
      cpu.ZF = masked === 0
      cpu.SF = (masked & 0x8000) !== 0
      log = `${args[0]} ← ${a} - 1 = ${masked}`
      break
    }
    case 'CMP': {
      const a = resolveSrc(args[0], cpu)
      const b = resolveSrc(args[1], cpu)
      const result = a - b
      setFlagsArith(cpu, a, b, result, true)
      log = `CMP ${a}, ${b} → ZF=${cpu.ZF ? 1 : 0} SF=${cpu.SF ? 1 : 0} CF=${cpu.CF ? 1 : 0}`
      break
    }
    case 'JMP': {
      const target = labels[args[0].toUpperCase()]
      if (target !== undefined) {
        cpu.IP = target
        jumped = true
        log = `JMP ${args[0]} → IP=${target}`
      } else {
        log = `JMP ${args[0]} — label not found`
      }
      break
    }
    case 'JE':
    case 'JNE':
    case 'JNZ':
    case 'JG':
    case 'JL': {
      const target = labels[args[0].toUpperCase()]
      const opNorm = op === 'JNZ' ? 'JNE' : op
      let take = false
      let reason = ''
      switch (opNorm) {
        case 'JE': take = cpu.ZF; reason = `ZF=${cpu.ZF ? 1 : 0}`; break
        case 'JNE': take = !cpu.ZF; reason = `ZF=${cpu.ZF ? 1 : 0}`; break
        case 'JG': take = !cpu.ZF && (cpu.SF === cpu.OF); reason = `ZF=${cpu.ZF ? 1 : 0}, SF=${cpu.SF ? 1 : 0}=OF=${cpu.OF ? 1 : 0}`; break
        case 'JL': take = (cpu.SF !== cpu.OF); reason = `SF=${cpu.SF ? 1 : 0}≠OF=${cpu.OF ? 1 : 0}`; break
      }
      if (take && target !== undefined) {
        cpu.IP = target
        jumped = true
        log = `${op} ${args[0]} — taken (${reason}) → IP=${target}`
      } else {
        log = `${op} ${args[0]} — not taken (${reason})`
      }
      break
    }
    case 'HLT': {
      cpu.halted = true
      log = 'HLT — program halted'
      break
    }
    case 'NOP': {
      log = 'NOP'
      break
    }
  }

  if (!jumped) cpu.IP += 1
  return { log }
}

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------
const EXAMPLES: Record<string, string> = {
  add: `; Addition of two numbers
MOV AX, 5
MOV BX, 7
ADD AX, BX        ; AX = AX + BX = 12
HLT`,
  sub: `; Subtraction
MOV AX, 15
MOV BX, 6
SUB AX, BX        ; AX = AX - BX = 9
HLT`,
  largest: `; Find largest element in array
MOV [0], 12
MOV [1], 45
MOV [2], 7
MOV [3], 23
MOV [4], 19
MOV CX, 5         ; counter
MOV BX, 0         ; index
MOV DX, [0]       ; largest = first element
LOOP:
MOV AX, [BX]      ; load current element
CMP DX, AX        ; compare largest with current
JG  NEXT          ; if DX > AX, keep DX
MOV DX, AX        ; else DX = AX (new largest)
NEXT:
INC BX
DEC CX
JNZ LOOP          ; loop while CX != 0
HLT`,
  sum: `; Sum of array elements
MOV [0], 12
MOV [1], 45
MOV [2], 7
MOV [3], 23
MOV [4], 19
MOV CX, 5         ; counter
MOV BX, 0         ; index
MOV AX, 0         ; sum = 0
LOOP:
ADD AX, [BX]      ; sum += arr[BX]
INC BX
DEC CX
JNZ LOOP
HLT`,
  mul: `; Multiplication
MOV AX, 6
MOV BX, 7
MUL BX            ; AX = AX * BX = 42
HLT`,
}

const EXAMPLE_LABELS: { key: string; label: string }[] = [
  { key: 'add', label: '1. Addition of two numbers' },
  { key: 'sub', label: '2. Subtraction' },
  { key: 'largest', label: '3. Find largest in array' },
  { key: 'sum', label: '4. Sum of array elements' },
  { key: 'mul', label: '5. Multiplication' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toHex(n: number, digits = 4): string {
  return (n & 0xFFFF).toString(16).toUpperCase().padStart(digits, '0')
}

function stateSnapshot(cpu: CPUState): string {
  return `AX=${toHex(cpu.AX)} BX=${toHex(cpu.BX)} CX=${toHex(cpu.CX)} DX=${toHex(cpu.DX)} IP=${cpu.IP}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MicroprocessorLab() {
  const [code, setCode] = useState(EXAMPLES.add)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [cpu, setCpu] = useState<CPUState>(createCPU)
  const [log, setLog] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [picoMsg, setPicoMsg] = useState("Hi! I'm Pico. Load an example, hit Assemble, then Step or Run to watch the registers change.")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const assemble = useCallback(() => {
    const result = parse(code)
    setParsed(result)
    setCpu(createCPU())
    setLog([])
    setStepCount(0)
    setRunning(false)
    if (result.errors.length === 0) {
      setPicoMsg(`Assembled ${result.instructions.length} instructions. ${Object.keys(result.labels).length} label(s) found. Press Step or Run!`)
    } else {
      setPicoMsg(`Hmm, ${result.errors.length} error(s) found. Check the lines flagged in red.`)
    }
  }, [code])

  const stepOnce = useCallback(() => {
    setCpu((prev) => {
      if (!parsed || prev.halted || prev.IP >= parsed.instructions.length) {
        setRunning(false)
        return prev
      }
      const next = { ...prev, memory: new Map(prev.memory) }
      const inst = parsed.instructions[prev.IP]
      const { log: entry } = executeOne(inst, next, parsed.labels)
      setLog((l) => [
        ...l,
        {
          step: l.length + 1,
          raw: inst.raw,
          effect: entry,
          state: stateSnapshot(next),
        },
      ])
      setStepCount((s) => s + 1)
      if (next.halted || next.IP >= parsed.instructions.length) {
        setRunning(false)
        setPicoMsg('Program halted. Final result is in the registers!')
      } else if (entry.includes('←')) {
        setPicoMsg(`Just executed "${inst.raw}" — see how the destination changed?`)
      }
      return next
    })
  }, [parsed])

  // Run loop
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = setInterval(() => {
      setCpu((prev) => {
        if (!parsed || prev.halted || prev.IP >= parsed.instructions.length) {
          setRunning(false)
          return prev
        }
        const next = { ...prev, memory: new Map(prev.memory) }
        const inst = parsed.instructions[prev.IP]
        const { log: entry } = executeOne(inst, next, parsed.labels)
        setLog((l) => [...l, { step: l.length + 1, raw: inst.raw, effect: entry, state: stateSnapshot(next) }])
        setStepCount((s) => s + 1)
        if (next.halted || next.IP >= parsed.instructions.length) {
          setRunning(false)
          setPicoMsg('Program halted. Final result is in the registers!')
        }
        return next
      })
    }, 400)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running, parsed])

  const reset = () => {
    setCpu(createCPU())
    setLog([])
    setStepCount(0)
    setRunning(false)
    setPicoMsg('CPU reset. All registers cleared. Press Step or Run.')
  }

  const loadExample = (key: string) => {
    setCode(EXAMPLES[key])
    setParsed(null)
    setCpu(createCPU())
    setLog([])
    setStepCount(0)
    setRunning(false)
    setPicoMsg(`Loaded example. Press Assemble to parse, then Step or Run.`)
  }

  const currentLine = parsed && cpu.IP < parsed.instructions.length ? parsed.instructions[cpu.IP].lineNum : -1
  const haltedOrDone = cpu.halted || (parsed !== null && cpu.IP >= parsed.instructions.length)

  // Memory display: 4 rows × 16 cols = 64 cells
  const memRows = Array.from({ length: 4 }, (_, r) => r)
  const memCols = Array.from({ length: 16 }, (_, c) => c)

  return (
    <div className="space-y-4">
      {/* Editor + Controls */}
      <Card className="border-pink-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4 text-pink-500" />
                8086 Assembly Editor
              </CardTitle>
              <CardDescription className="text-xs">Type your code or pick a guided example.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={loadExample}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder="Load example..." />
                </SelectTrigger>
                <SelectContent>
                  {EXAMPLE_LABELS.map((e) => (
                    <SelectItem key={e.key} value={e.key} className="text-xs">{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="font-mono text-xs min-h-[260px] bg-muted/30 leading-relaxed"
                placeholder="; Write your 8086 assembly here&#10;MOV AX, 5&#10;HLT"
              />
              {parsed && parsed.errors.length > 0 && (
                <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/30 p-2 space-y-1">
                  {parsed.errors.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Line {e.line}: {e.msg}
                    </div>
                  ))}
                </div>
              )}
              {parsed && parsed.errors.length === 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Assembled OK — {parsed.instructions.length} instructions, {Object.keys(parsed.labels).length} label(s).
                </div>
              )}
            </div>
            <div className="flex md:flex-col gap-2 md:w-28">
              <Button onClick={assemble} className="gap-1.5 bg-pink-600 hover:bg-pink-700 flex-1">
                <FileCode2 className="h-4 w-4" /> Assemble
              </Button>
              <Button
                variant="outline"
                onClick={stepOnce}
                disabled={!parsed || parsed.errors.length > 0 || haltedOrDone}
                className="gap-1.5 flex-1"
              >
                <SkipForward className="h-4 w-4" /> Step
              </Button>
              <Button
                variant="outline"
                onClick={() => setRunning((r) => !r)}
                disabled={!parsed || parsed.errors.length > 0 || haltedOrDone}
                className="gap-1.5 flex-1"
              >
                {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'Stop' : 'Run'}
              </Button>
              <Button variant="ghost" onClick={reset} className="gap-1.5 flex-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
          {parsed && (
            <div className="rounded-md bg-muted/30 border border-border p-2 max-h-32 overflow-auto">
              <p className="text-meta text-muted-foreground mb-1 uppercase tracking-wide">Program Listing</p>
              <div className="space-y-0.5">
                {parsed.instructions.map((inst, i) => {
                  const labelsAt = Object.entries(parsed.labels).filter(([, idx]) => idx === i).map(([n]) => n)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-2 text-xs font-mono px-2 py-0.5 rounded',
                        cpu.IP === i && 'bg-pink-500/20 text-pink-700 dark:text-pink-300',
                      )}
                    >
                      <span className="opacity-40 w-8 shrink-0">{String(inst.lineNum).padStart(2, '0')}</span>
                      <span className="opacity-40 w-8 shrink-0">{String(i).padStart(2, '0')}:</span>
                      <span className="flex-1">{inst.raw}</span>
                      {labelsAt.length > 0 && (
                        <span className="text-pink-500 text-meta">[{labelsAt.join(', ')}:]</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registers + Memory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-pink-500" /> Registers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REGS.map((r) => {
                const val = cpu[r]
                return (
                  <motion.div
                    key={r}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 text-center"
                  >
                    <p className="text-meta font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">{r}</p>
                    <p className="text-base font-mono font-bold mt-1">0x{toHex(val)}</p>
                    <p className="text-meta text-muted-foreground">{val}</p>
                  </motion.div>
                )
              })}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">Instruction Pointer</p>
                <p className="text-base font-mono font-bold mt-1 text-pink-600 dark:text-pink-400">
                  0x{toHex(cpu.IP)}
                  <span className="text-xs text-muted-foreground ml-2">(line {currentLine > 0 ? currentLine : '—'})</span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">Flags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <FlagBadge name="CF" on={cpu.CF} />
                  <FlagBadge name="ZF" on={cpu.ZF} />
                  <FlagBadge name="SF" on={cpu.SF} />
                  <FlagBadge name="OF" on={cpu.OF} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-xs">
              {haltedOrDone ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Halted
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <span className={cn('h-2 w-2 rounded-full', running ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground')} />
                  {running ? 'Running' : 'Idle'}
                </Badge>
              )}
              <Badge variant="outline" className="text-meta">Steps: {stepCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-pink-500" /> Memory (64 bytes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-meta font-mono">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left p-1 sticky left-0 bg-card"></th>
                    {memCols.map((c) => (
                      <th key={c} className="text-center p-1 text-meta">+{toHex(c, 1)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memRows.map((r) => (
                    <tr key={r}>
                      <td className="p-1 text-meta text-muted-foreground sticky left-0 bg-card">0x{toHex(r * 16, 3)}0</td>
                      {memCols.map((c) => {
                        const addr = r * 16 + c
                        const val = cpu.memory.get(addr) || 0
                        return (
                          <td key={c} className="text-center p-1">
                            <span
                              className={cn(
                                'inline-block w-7 h-5 leading-5 rounded',
                                val !== 0
                                  ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold'
                                  : 'text-muted-foreground/40'
                              )}
                            >
                              {toHex(val, 2)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution log + Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-pink-500" /> Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56 rounded-md border border-border bg-muted/20">
              {log.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Press Assemble then Step / Run to see execution trace.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {log.map((e) => (
                    <div key={e.step} className="p-2 text-xs font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-meta">#{e.step}</Badge>
                        <span className="text-pink-600 dark:text-pink-400 font-semibold">{e.raw}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 ml-1">→ {e.effect}</p>
                      <p className="text-meta text-muted-foreground/70 mt-0.5 ml-1">{e.state}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="rounded-xl bg-pink-500/5 border border-pink-500/20 p-4 flex items-start gap-3">
          <Mascot mascot="pico" state={haltedOrDone ? 'correct' : 'explaining'} size={56} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-pink-700 dark:text-pink-300">Pico says:</p>
            <p className="text-sm mt-0.5 leading-relaxed">{picoMsg}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FlagBadge({ name, on }: { name: string; on: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-6 min-w-7 px-1.5 rounded-md text-meta font-mono font-bold border transition-colors',
        on
          ? 'bg-pink-500 text-white border-pink-600'
          : 'bg-muted/40 text-muted-foreground border-border'
      )}
      title={on ? `${name} = 1 (set)` : `${name} = 0 (clear)`}
    >
      {name}
    </span>
  )
}
