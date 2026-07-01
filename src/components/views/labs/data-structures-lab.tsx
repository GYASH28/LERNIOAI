'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Shuffle, Search, ArrowRightLeft,
  Code2, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'

type AlgoKey = 'bubble' | 'selection' | 'insertion' | 'linear' | 'binary'

interface DSStep {
  array: number[]
  comparing: number[]
  swapping: number[]
  sorted: number[]
  found: number | null
  label: string
  line: number
}

const ALGO_META: Record<AlgoKey, { label: string; time: string; space: string; kind: 'sort' | 'search'; pseudo: string[] }> = {
  bubble: {
    label: 'Bubble Sort',
    time: 'O(n²)',
    space: 'O(1)',
    kind: 'sort',
    pseudo: [
      'for i = 0 to n-2',
      '  for j = 0 to n-i-2',
      '    if arr[j] > arr[j+1]',
      '      swap(arr[j], arr[j+1])',
    ],
  },
  selection: {
    label: 'Selection Sort',
    time: 'O(n²)',
    space: 'O(1)',
    kind: 'sort',
    pseudo: [
      'for i = 0 to n-2',
      '  min = i',
      '  for j = i+1 to n-1',
      '    if arr[j] < arr[min]',
      '      min = j',
      '  swap(arr[i], arr[min])',
    ],
  },
  insertion: {
    label: 'Insertion Sort',
    time: 'O(n²)',
    space: 'O(1)',
    kind: 'sort',
    pseudo: [
      'for i = 1 to n-1',
      '  key = arr[i]',
      '  j = i - 1',
      '  while j >= 0 and arr[j] > key',
      '    arr[j+1] = arr[j]',
      '    j = j - 1',
      '  arr[j+1] = key',
    ],
  },
  linear: {
    label: 'Linear Search',
    time: 'O(n)',
    space: 'O(1)',
    kind: 'search',
    pseudo: [
      'for i = 0 to n-1',
      '  if arr[i] == target',
      '    return i',
      'return -1',
    ],
  },
  binary: {
    label: 'Binary Search',
    time: 'O(log n)',
    space: 'O(1)',
    kind: 'search',
    pseudo: [
      'low = 0, high = n-1',
      'while low <= high',
      '  mid = (low + high) / 2',
      '  if arr[mid] == target',
      '    return mid',
      '  else if arr[mid] < target',
      '    low = mid + 1',
      '  else high = mid - 1',
    ],
  },
}

// Step generators ------------------------------------------------------------
function bubbleSteps(arr: number[]): DSStep[] {
  const a = [...arr]
  const n = a.length
  const steps: DSStep[] = []
  const sorted: number[] = []
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: null, label: 'Starting Bubble Sort', line: 0 })
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({ array: [...a], comparing: [j, j + 1], swapping: [], sorted: [...sorted], found: null, label: `Compare arr[${j}]=${a[j]} and arr[${j + 1}]=${a[j + 1]}`, line: 2 })
      if (a[j] > a[j + 1]) {
        steps.push({ array: [...a], comparing: [], swapping: [j, j + 1], sorted: [...sorted], found: null, label: `${a[j]} > ${a[j + 1]} → swap`, line: 3 })
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: `After swap`, line: 3 })
      }
    }
    sorted.push(n - 1 - i)
  }
  sorted.push(0)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: 'Sorted! ✓', line: 0 })
  return steps
}

function selectionSteps(arr: number[]): DSStep[] {
  const a = [...arr]
  const n = a.length
  const steps: DSStep[] = []
  const sorted: number[] = []
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: null, label: 'Starting Selection Sort', line: 0 })
  for (let i = 0; i < n - 1; i++) {
    let min = i
    steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: `Pass ${i + 1}: assume min = index ${i} (value ${a[i]})`, line: 1 })
    for (let j = i + 1; j < n; j++) {
      steps.push({ array: [...a], comparing: [min, j], swapping: [], sorted: [...sorted], found: null, label: `Compare current min ${a[min]} with arr[${j}]=${a[j]}`, line: 3 })
      if (a[j] < a[min]) {
        min = j
        steps.push({ array: [...a], comparing: [min], swapping: [], sorted: [...sorted], found: null, label: `New min found at index ${min} (value ${a[min]})`, line: 4 })
      }
    }
    if (min !== i) {
      steps.push({ array: [...a], comparing: [], swapping: [i, min], sorted: [...sorted], found: null, label: `Swap arr[${i}] with arr[${min}]`, line: 5 })
      ;[a[i], a[min]] = [a[min], a[i]]
    }
    sorted.push(i)
    steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: `Index ${i} locked`, line: 5 })
  }
  sorted.push(n - 1)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: 'Sorted! ✓', line: 0 })
  return steps
}

function insertionSteps(arr: number[]): DSStep[] {
  const a = [...arr]
  const n = a.length
  const steps: DSStep[] = []
  const sorted: number[] = [0]
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [0], found: null, label: 'Starting Insertion Sort', line: 0 })
  for (let i = 1; i < n; i++) {
    const key = a[i]
    let j = i - 1
    steps.push({ array: [...a], comparing: [i], swapping: [], sorted: [...sorted], found: null, label: `Pick key = arr[${i}] = ${key}`, line: 1 })
    while (j >= 0 && a[j] > key) {
      steps.push({ array: [...a], comparing: [j, j + 1], swapping: [], sorted: [...sorted], found: null, label: `${a[j]} > ${key} → shift right`, line: 3 })
      a[j + 1] = a[j]
      steps.push({ array: [...a], comparing: [], swapping: [j + 1], sorted: [...sorted], found: null, label: `Moved ${a[j + 1]} to position ${j + 1}`, line: 4 })
      j--
    }
    a[j + 1] = key
    sorted.push(i)
    steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], found: null, label: `Placed ${key} at index ${j + 1}`, line: 6 })
  }
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), found: null, label: 'Sorted! ✓', line: 0 })
  return steps
}

function linearSteps(arr: number[], target: number): DSStep[] {
  const a = [...arr]
  const steps: DSStep[] = []
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: null, label: `Searching for ${target}`, line: 0 })
  for (let i = 0; i < a.length; i++) {
    steps.push({ array: [...a], comparing: [i], swapping: [], sorted: [], found: null, label: `Check arr[${i}] = ${a[i]}`, line: 1 })
    if (a[i] === target) {
      steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: i, label: `Found ${target} at index ${i}!`, line: 2 })
      return steps
    }
    steps.push({ array: [...a], comparing: [], swapping: [], sorted: [i], found: null, label: `Not ${target}, move on`, line: 1 })
  }
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, k) => k), found: -1, label: `${target} not found`, line: 3 })
  return steps
}

function binarySteps(arr: number[], target: number): DSStep[] {
  // sort a copy for binary search
  const a = [...arr].sort((x, y) => x - y)
  const steps: DSStep[] = []
  let low = 0
  let high = a.length - 1
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: null, label: `Array sorted. Searching for ${target}`, line: 0 })
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    steps.push({ array: [...a], comparing: [mid], swapping: [], sorted: [], found: null, label: `low=${low}, high=${high}, mid=${mid} → arr[${mid}]=${a[mid]}`, line: 2 })
    if (a[mid] === target) {
      steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], found: mid, label: `Found ${target} at index ${mid}!`, line: 4 })
      return steps
    } else if (a[mid] < target) {
      steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: mid + 1 }, (_, k) => k), found: null, label: `${a[mid]} < ${target} → search right half`, line: 6 })
      low = mid + 1
    } else {
      steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, k) => k).filter((k) => k >= mid), found: null, label: `${a[mid]} > ${target} → search left half`, line: 7 })
      high = mid - 1
    }
  }
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, k) => k), found: -1, label: `${target} not found`, line: 0 })
  return steps
}

function generateSteps(algo: AlgoKey, arr: number[], target: number): DSStep[] {
  switch (algo) {
    case 'bubble': return bubbleSteps(arr)
    case 'selection': return selectionSteps(arr)
    case 'insertion': return insertionSteps(arr)
    case 'linear': return linearSteps(arr, target)
    case 'binary': return binarySteps(arr, target)
  }
}

// Mascot messages ------------------------------------------------------------
const BYTE_MESSAGES: Record<string, string> = {
  start: "Hi! I'm Byte. Pick an algorithm and an array — let's visualize how it works!",
  compare: "Watch how we compare adjacent elements — that's the heart of the algorithm.",
  swap: "When the order is wrong, we swap. Two elements trade places!",
  sorted: "Look at those green bars — they're locked in place. Sorted!",
  search: "Searching is just walking through the array until we find the target.",
  binary: "Binary search halves the search space every step. That's why it's O(log n)!",
  found: "Bingo! Found the target. Notice how quickly we got here.",
}

function pickByteMessage(step: DSStep | null): string {
  if (!step) return BYTE_MESSAGES.start
  if (step.found !== null) return step.found >= 0 ? BYTE_MESSAGES.found : 'Not in this array — but that is a valid answer too!'
  if (step.label.includes('Sorted')) return BYTE_MESSAGES.sorted
  if (step.swapping.length) return BYTE_MESSAGES.swap
  if (step.comparing.length) return BYTE_MESSAGES.compare
  return step.label
}

export function DataStructuresLab() {
  const [algo, setAlgo] = useState<AlgoKey>('bubble')
  const [inputText, setInputText] = useState('64, 34, 25, 12, 22, 11, 90')
  const [targetText, setTargetText] = useState('25')
  const [steps, setSteps] = useState<DSStep[]>(() => bubbleSteps([64, 34, 25, 12, 22, 11, 90]))
  const [stepIdx, setStepIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [showPseudo, setShowPseudo] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const meta = ALGO_META[algo]
  const current = steps[stepIdx] || null
  const maxValue = useMemo(() => Math.max(...(current?.array || [1]), 1), [current])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Auto-play loop
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    const delay = Math.max(120, 1100 - speed * 200)
    intervalRef.current = setInterval(() => {
      setStepIdx((idx) => {
        if (idx >= steps.length - 1) {
          setPlaying(false)
          return idx
        }
        return idx + 1
      })
    }, delay)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [playing, speed, steps.length])

  const runAlgorithm = useCallback(() => {
    const parsed = inputText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n))
    if (parsed.length === 0) return
    const target = parseInt(targetText, 10) || 0
    const newSteps = generateSteps(algo, parsed, target)
    setSteps(newSteps)
    setStepIdx(0)
    setPlaying(false)
  }, [algo, inputText, targetText])

  const randomize = () => {
    const n = 7 + Math.floor(Math.random() * 4)
    const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 10)
    setInputText(arr.join(', '))
    const target = arr[Math.floor(Math.random() * arr.length)]
    setTargetText(String(target))
    setSteps(generateSteps(algo, arr, target))
    setStepIdx(0)
    setPlaying(false)
  }

  const onAlgoChange = (key: AlgoKey) => {
    setAlgo(key)
    const parsed = inputText
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n))
    if (parsed.length > 0) {
      const target = parseInt(targetText, 10) || 0
      setSteps(generateSteps(key, parsed, target))
      setStepIdx(0)
      setPlaying(false)
    }
  }

  const stepForward = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1))
  const stepBackward = () => setStepIdx((i) => Math.max(i - 1, 0))
  const restart = () => { setStepIdx(0); setPlaying(false) }

  const byteMsg = pickByteMessage(current)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="h-4 w-4 text-cyan-500" />
            Data Structures Visualizer
          </CardTitle>
          <CardDescription>Pick an algorithm, enter an array, and watch it run step-by-step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Algorithm</Label>
              <Select value={algo} onValueChange={(v) => onAlgoChange(v as AlgoKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bubble">Bubble Sort</SelectItem>
                  <SelectItem value="selection">Selection Sort</SelectItem>
                  <SelectItem value="insertion">Insertion Sort</SelectItem>
                  <SelectItem value="linear">Linear Search</SelectItem>
                  <SelectItem value="binary">Binary Search</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Array (comma separated)</Label>
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="64, 34, 25, 12, 22, 11, 90"
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={randomize} title="Random array">
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            {meta.kind === 'search' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Target</Label>
                <Input
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  className="w-28 font-mono text-xs"
                  placeholder="25"
                />
              </div>
            )}
            <Button onClick={runAlgorithm} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
              {meta.kind === 'search' ? <Search className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
              {meta.kind === 'search' ? 'Search' : 'Sort'}
            </Button>
            <div className="flex-1" />
            <div className="flex gap-1.5 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)} className="gap-1.5">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button variant="outline" size="icon" onClick={stepBackward} disabled={stepIdx === 0} title="Step back">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={stepForward} disabled={stepIdx >= steps.length - 1} title="Step forward">
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={restart} title="Restart">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Speed: {speed}x</Label>
              <Badge variant="outline" className="text-meta">Step {stepIdx + 1} / {steps.length}</Badge>
            </div>
            <Slider value={[speed]} min={1} max={5} step={1} onValueChange={(v) => setSpeed(v[0])} />
          </div>
        </CardContent>
      </Card>

      {/* Visualization + Info side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-cyan-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Visualization</CardTitle>
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">{current?.label || '—'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/30 border border-border p-4">
              <div className="flex items-end justify-center gap-2 h-64 flex-wrap">
                {current?.array.map((v, i) => {
                  const isComparing = current.comparing.includes(i)
                  const isSwapping = current.swapping.includes(i)
                  const isSorted = current.sorted.includes(i)
                  const isFound = current.found === i
                  const heightPct = (v / maxValue) * 100
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.span
                        key={`lbl-${v}`}
                        initial={{ opacity: 0.4, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={cn(
                          'text-xs font-mono font-bold',
                          isFound ? 'text-emerald-500' : isSwapping ? 'text-red-500' : isComparing ? 'text-amber-500' : 'text-muted-foreground'
                        )}
                      >
                        {v}
                      </motion.span>
                      <motion.div
                        animate={{
                          height: Math.max(20, heightPct * 2),
                          backgroundColor: isFound
                            ? '#10b981'
                            : isSwapping
                              ? '#ef4444'
                              : isComparing
                                ? '#fbbf24'
                                : isSorted
                                  ? '#10b981b3'
                                  : '#06b6d4b3',
                        }}
                        transition={{ duration: 0.25 }}
                        className="w-9 rounded-t-md border-b-2 border-foreground/10"
                        style={{ height: Math.max(20, heightPct * 2) }}
                      />
                      <span className="text-meta text-muted-foreground font-mono">{i}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-meta">
              <Legend color="bg-cyan-500/70" label="Unsorted" />
              <Legend color="bg-amber-400" label="Comparing" />
              <Legend color="bg-red-500" label="Swapping" />
              <Legend color="bg-emerald-500" label="Sorted / Found" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Info Panel</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowPseudo((s) => !s)}
              >
                {showPseudo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Pseudocode
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-meta">⏱ {meta.time}</Badge>
              <Badge variant="outline" className="text-meta">💾 {meta.space}</Badge>
              <Badge variant="outline" className="text-meta capitalize">{meta.kind}</Badge>
            </div>
            <AnimatePresence initial={false}>
              {showPseudo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg bg-muted/40 border border-border p-3 font-mono text-xs space-y-0.5">
                    {meta.pseudo.map((line, i) => {
                      const lineNum = i + 1
                      return (
                        <div
                          key={i}
                          className={cn(
                            'px-2 py-0.5 rounded transition-colors',
                            current?.line === lineNum
                              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          <span className="opacity-40 mr-2 select-none">{lineNum}</span>
                          {line}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Separator />
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3">
              <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-1">Current Step</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{current?.label || 'Run the algorithm to begin.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Byte mascot */}
      <div className="flex items-start gap-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3">
        <Mascot mascot="byte" state={current?.found !== null && current?.found !== undefined && current.found >= 0 ? 'correct' : 'explaining'} size={56} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Byte says:</p>
          <p className="text-sm mt-0.5">{byteMsg}</p>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded', color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
