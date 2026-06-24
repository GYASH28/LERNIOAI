'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FlaskConical, Cpu, Waves, ChevronRight, Clock, BookOpen } from 'lucide-react'
import { Mascot } from '@/components/mascots/mascot'
import { DataStructuresLab } from '@/components/views/labs/data-structures-lab'
import { MicroprocessorLab } from '@/components/views/labs/microprocessor-lab'
import { DataCommunicationLab } from '@/components/views/labs/data-communication-lab'

type LabKey = 'ds' | 'mp8086' | 'dc' | null

interface LabMeta {
  key: Exclude<LabKey, null>
  title: string
  subtitle: string
  description: string
  mascot: 'byte' | 'pico' | 'nova'
  accent: string
  topics: string[]
  duration: string
  icon: typeof FlaskConical
}

const LABS: LabMeta[] = [
  {
    key: 'ds',
    title: 'Data Structures Visualizer',
    subtitle: 'Sort & search algorithms',
    description: 'Watch Bubble, Selection, Insertion Sort and Linear / Binary Search run step-by-step on real arrays. Play, pause, scrub and read the pseudocode side-by-side.',
    mascot: 'byte',
    accent: '#06b6d4',
    topics: ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Linear Search', 'Binary Search'],
    duration: '15–25 min',
    icon: FlaskConical,
  },
  {
    key: 'mp8086',
    title: '8086 Microprocessor Simulator',
    subtitle: 'Write & run assembly',
    description: 'A real 8086 interpreter in your browser. Type MOV / ADD / SUB / MUL / CMP / JMP and watch AX, BX, CX, DX, IP and the FLAGS change as each instruction executes.',
    mascot: 'pico',
    accent: '#ec4899',
    topics: ['Registers', 'Memory', 'Jumps & FLAGS', 'Loops', '5 guided examples'],
    duration: '20–30 min',
    icon: Cpu,
  },
  {
    key: 'dc',
    title: 'Data Communication Lab',
    subtitle: 'Signals, OSI, modulation',
    description: 'Four interactive modules: analog/digital signal generator with sliders, the OSI 7-layer matching game, AM / FM / PM modulation, and packet vs circuit switching animations.',
    mascot: 'nova',
    accent: '#10b981',
    topics: ['Signal types', 'OSI model', 'Modulation (AM/FM/PM)', 'Switching'],
    duration: '25–40 min',
    icon: Waves,
  },
]

export function LabsView() {
  const [activeLab, setActiveLab] = useState<LabKey>(null)

  if (activeLab) {
    const meta = LABS.find((l) => l.key === activeLab)!
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 flex-wrap"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveLab(null)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            All Labs
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-meta">
              <Clock className="h-3 w-3" />
              {meta.duration}
            </Badge>
            <Badge
              variant="outline"
              className="text-meta border-current/30"
              style={{ color: meta.accent }}
            >
              {meta.subtitle}
            </Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{ backgroundColor: `${meta.accent}0d`, borderColor: `${meta.accent}33` }}
        >
          <Mascot mascot={meta.mascot} state="greeting" size={48} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-bold leading-tight" style={{ color: meta.accent }}>
              {meta.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta.description}</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeLab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeLab === 'ds' && <DataStructuresLab />}
            {activeLab === 'mp8086' && <MicroprocessorLab />}
            {activeLab === 'dc' && <DataCommunicationLab />}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return <LabsHub onOpen={(k) => setActiveLab(k)} />
}

function LabsHub({ onOpen }: { onOpen: (k: Exclude<LabKey, null>) => void }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-pink-500/10 p-5 md:p-6"
      >
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <Mascot mascot="leo" state="explaining" size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Interactive Labs</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Learn by doing. Three simulators cover Data Structures, the 8086 microprocessor, and Data Communication — all running live in your browser, no install required.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LABS.map((lab, idx) => {
          const Icon = lab.icon
          return (
            <motion.div
              key={lab.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card
                className="h-full cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group overflow-hidden relative"
                onClick={() => onOpen(lab.key)}
                style={{ borderColor: `${lab.accent}33` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: lab.accent }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${lab.accent}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: lab.accent }} />
                    </div>
                    <Mascot mascot={lab.mascot} state="idle" size={44} animated={false} />
                  </div>
                  <CardTitle className="text-base mt-2" style={{ color: lab.accent }}>
                    {lab.title}
                  </CardTitle>
                  <CardDescription className="text-xs">{lab.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {lab.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lab.topics.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-meta font-medium"
                        style={{ color: lab.accent, borderColor: `${lab.accent}40` }}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-meta text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {lab.duration}
                  </span>
                  <Button
                    size="sm"
                    className="gap-1.5 group-hover:gap-2 transition-all"
                    style={{ backgroundColor: lab.accent, color: 'white' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(lab.key)
                    }}
                  >
                    Open Lab
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-muted/20 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">How to use these labs</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">1. Pick a lab</p>
            <p>Each card opens a self-contained simulator with its own mascot guide.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">2. Experiment</p>
            <p>Adjust inputs, run algorithms, write assembly, watch signals change.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">3. Read the mascot</p>
            <p>Your mascot companion explains what's happening at every step.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
