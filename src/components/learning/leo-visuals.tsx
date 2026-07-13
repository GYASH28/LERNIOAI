'use client'

/**
 * LEO Visual Renderers
 * --------------------
 * Inline visual-explanation components the AI tutor can emit inside chat
 * messages to illustrate a concept (flowchart, comparison table, numbered
 * steps, analogy mapping, mind map). Every visual is palette-aware (semantic
 * OKLCH tokens via inline `style`), dark-mode-ready, responsive, and wrapped
 * in a consistent card shell with a framer-motion entrance animation.
 *
 * Usage:
 *   <VisualRenderer data={visualData} />
 * where `visualData` is a discriminated union keyed on `data.type`.
 */

import { motion } from 'framer-motion'
import {
  Play,
  Circle,
  GitBranch,
  SquareCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Lightbulb,
  Workflow,
  Table2,
  ListOrdered,
  Network,
  BookOpen,
  Check,
  Code2,
  PenLine,
  Beaker,
  Rocket,
  Target,
  Zap,
  Search,
  Brain,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface FlowchartData {
  type: 'flowchart'
  title?: string
  nodes: Array<{ id: string; label: string; type?: 'start' | 'process' | 'decision' | 'end' }>
  edges: Array<{ from: string; to: string; label?: string }>
}

export interface ComparisonData {
  type: 'comparison'
  title?: string
  columns: string[]
  rows: Array<{ feature: string; values: string[] }>
}

export interface StepsData {
  type: 'steps'
  title?: string
  steps: Array<{ title: string; description: string; icon?: string }>
}

export interface AnalogyData {
  type: 'analogy'
  title?: string
  scenario: string
  mappings: Array<{ concept: string; analogy: string }>
}

export interface MindMapData {
  type: 'mindmap'
  title?: string
  center: string
  branches: Array<{ label: string; children?: string[] }>
}

export type VisualData =
  | FlowchartData
  | ComparisonData
  | StepsData
  | AnalogyData
  | MindMapData

/* -------------------------------------------------------------------------- */
/* Shared primitives                                                           */
/* -------------------------------------------------------------------------- */

const CARD_STYLE: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--surface-1)',
  borderRadius: '12px',
  padding: '16px',
}

/** Hex/keyword colors are opaque; tokens need a translucent tint for icon chips. */
function tint(token: string, percent: number): string {
  return `color-mix(in oklch, ${token} ${percent}%, transparent)`
}

function VisualHeader({
  icon: Icon,
  title,
  accent,
}: {
  icon: LucideIcon
  title: string
  accent?: string
}) {
  const accentToken = accent ?? 'var(--brand)'
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: tint(accentToken, 14),
          color: accentToken,
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <h4
        className="m-0 text-sm font-semibold leading-tight"
        style={{ color: 'var(--text-strong)', letterSpacing: '-0.01em' }}
      >
        {title}
      </h4>
    </div>
  )
}

function VisualShell({
  icon,
  title,
  accent,
  ariaLabel,
  children,
}: {
  icon: LucideIcon
  title?: string
  accent?: string
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col"
      style={CARD_STYLE}
      aria-label={ariaLabel ?? title}
      role="figure"
    >
      {title ? <VisualHeader icon={icon} title={title} accent={accent} /> : null}
      {children}
    </motion.section>
  )
}

/** Self-contained mobile detection (avoids cross-module coupling). */
function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(window.innerWidth < breakpoint)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [breakpoint])
  return isMobile
}

/* -------------------------------------------------------------------------- */
/* 1. FlowchartVisual                                                          */
/* -------------------------------------------------------------------------- */

const FLOW_NODE_ICONS: Record<NonNullable<FlowchartData['nodes'][number]['type']>, LucideIcon> = {
  start: Play,
  process: Circle,
  decision: GitBranch,
  end: SquareCheck,
}

const FLOW_NODE_ACCENTS: Record<NonNullable<FlowchartData['nodes'][number]['type']>, string> = {
  start: 'var(--success)',
  process: 'var(--brand)',
  decision: 'var(--warning)',
  end: 'var(--info)',
}

export function FlowchartVisual({ data }: { data: FlowchartData }) {
  const isMobile = useIsMobile()
  const vertical = isMobile || data.nodes.length >= 4
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))

  return (
    <VisualShell icon={Workflow} title={data.title} ariaLabel="Flowchart">
      <div
        className="flex"
        style={{
          flexDirection: vertical ? 'column' : 'row',
          alignItems: vertical ? 'stretch' : 'flex-start',
          gap: '2px',
        }}
      >
        {data.nodes.map((node, i) => {
          const Icon = node.type ? FLOW_NODE_ICONS[node.type] : Circle
          const accent = node.type ? FLOW_NODE_ACCENTS[node.type] : 'var(--brand)'
          const outgoing = data.edges.filter((e) => e.from === node.id)
          const nextNode = data.nodes[i + 1]
          const primaryEdge = nextNode
            ? outgoing.find((e) => e.to === nextNode.id)
            : undefined
          const branchEdges = outgoing.filter((e) => e !== primaryEdge)

          return (
            <div
              key={node.id}
              className="flex"
              style={{
                flexDirection: vertical ? 'column' : 'row',
                alignItems: vertical ? 'stretch' : 'flex-start',
                gap: '2px',
                flex: vertical ? undefined : '1 1 0',
                minWidth: 0,
              }}
            >
              {/* Node + side branches */}
              <div
                className="flex"
                style={{
                  flexDirection: vertical ? 'row' : 'column',
                  alignItems: vertical ? 'flex-start' : 'stretch',
                  gap: '6px',
                  flex: vertical ? '1 1 auto' : undefined,
                  minWidth: 0,
                }}
              >
                <FlowNodeCard icon={Icon} label={node.label} accent={accent} />

                {branchEdges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" style={{ paddingTop: vertical ? 0 : '4px' }}>
                    {branchEdges.map((edge, j) => {
                      const target = nodeMap.get(edge.to)
                      return (
                        <span
                          key={`${edge.from}-${edge.to}-${j}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium"
                          style={{
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--surface-inset)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          {edge.label && (
                            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                              {edge.label}:
                            </span>
                          )}
                          <ArrowRight className="h-3 w-3" style={{ color: 'var(--text-muted)' }} aria-hidden />
                          <span style={{ color: 'var(--text-default)' }}>{target?.label ?? edge.to}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Primary arrow to the next node in the spine */}
              {primaryEdge && <FlowArrow vertical={vertical} label={primaryEdge.label} />}
            </div>
          )
        })}
      </div>
    </VisualShell>
  )
}

function FlowNodeCard({
  icon: Icon,
  label,
  accent,
}: {
  icon: LucideIcon
  label: string
  accent: string
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-[10px] px-3 py-2.5"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        boxShadow: `0 1px 2px ${tint('var(--text-strong)', 6)}`,
      }}
    >
      <span
        aria-hidden
        className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: tint(accent, 16), color: accent }}
      >
        <Icon className="h-[13px] w-[13px]" />
      </span>
      <span
        className="text-[13px] font-medium leading-snug"
        style={{ color: 'var(--text-strong)', overflowWrap: 'anywhere' }}
      >
        {label}
      </span>
    </div>
  )
}

function FlowArrow({ vertical, label }: { vertical: boolean; label?: string }) {
  const Arrow = vertical ? ChevronDown : ChevronRight
  return (
    <div
      className="flex items-center justify-center"
      style={{
        flexDirection: vertical ? 'column' : 'row',
        gap: '2px',
        padding: '4px 0',
        color: 'var(--text-muted)',
      }}
    >
      <Arrow className="h-[18px] w-[18px]" aria-hidden />
      {label && (
        <span
          className="whitespace-nowrap rounded px-1.5 py-px text-[11px] font-medium"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 2. ComparisonTableVisual                                                   */
/* -------------------------------------------------------------------------- */

export function ComparisonTableVisual({ data }: { data: ComparisonData }) {
  return (
    <VisualShell icon={Table2} title={data.title} ariaLabel="Comparison table">
      <div className="-m-1 overflow-x-auto p-1">
        <table
          className="w-full"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '13px',
            minWidth: '100%',
          }}
        >
          <thead>
            <tr>
              <th style={compHeaderStyle(true)}>Feature</th>
              {data.columns.map((col, i) => (
                <th key={i} style={compHeaderStyle(false)}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => {
              const isAlt = r % 2 === 1
              return (
                <tr key={r}>
                  <td
                    style={{
                      ...compBodyStyle(isAlt, true),
                      fontWeight: 600,
                      color: 'var(--text-strong)',
                    }}
                  >
                    {row.feature}
                  </td>
                  {row.values.map((val, v) => (
                    <td key={v} style={compBodyStyle(isAlt, false)}>
                      {val}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </VisualShell>
  )
}

function compHeaderStyle(isFirst: boolean): CSSProperties {
  return {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    backgroundColor: tint('var(--brand)', 8),
    borderBottom: '1px solid var(--border-default)',
    borderRight: isFirst ? '1px solid var(--border-subtle)' : undefined,
    whiteSpace: 'nowrap',
  }
}

function compBodyStyle(isAlt: boolean, isFirst: boolean): CSSProperties {
  return {
    padding: '10px 12px',
    color: 'var(--text-default)',
    backgroundColor: isAlt ? 'var(--surface-inset)' : 'var(--surface-1)',
    borderBottom: '1px solid var(--border-subtle)',
    borderRight: isFirst ? '1px solid var(--border-subtle)' : undefined,
    verticalAlign: 'top',
    overflowWrap: 'anywhere',
  }
}

/* -------------------------------------------------------------------------- */
/* 3. StepsVisual                                                             */
/* -------------------------------------------------------------------------- */

const STEP_ICON_REGISTRY: Record<string, LucideIcon> = {
  play: Play,
  check: Check,
  code: Code2,
  book: BookOpen,
  pen: PenLine,
  lightbulb: Lightbulb,
  beaker: Beaker,
  rocket: Rocket,
  target: Target,
  zap: Zap,
  search: Search,
  brain: Brain,
}

export function StepsVisual({ data }: { data: StepsData }) {
  return (
    <VisualShell icon={ListOrdered} title={data.title} ariaLabel="Steps">
      <ol
        className="m-0 flex list-none flex-col gap-2.5 p-0"
        style={{ position: 'relative' }}
      >
        {data.steps.map((step, i) => {
          const Icon = step.icon ? STEP_ICON_REGISTRY[step.icon.toLowerCase()] : undefined
          const isLast = i === data.steps.length - 1
          return (
            <li key={i} className="relative flex gap-3">
              {/* Number / icon circle */}
              <span
                aria-hidden
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  backgroundColor: 'var(--brand)',
                  color: 'var(--surface-1)',
                  boxShadow: `0 0 0 4px var(--surface-1)`,
                }}
              >
                {Icon ? <Icon className="h-[15px] w-[15px]" /> : i + 1}
              </span>

              {/* Connector segment to the next step (hidden on the last item) */}
              {!isLast && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '15px',
                    top: '32px',
                    bottom: '-26px',
                    width: '2px',
                    backgroundColor: 'var(--brand)',
                    opacity: 0.35,
                    zIndex: 0,
                  }}
                />
              )}

              {/* Content */}
              <div className="min-w-0 flex-1 pb-1">
                <div
                  className="mb-0.5 text-sm font-semibold leading-snug"
                  style={{ color: 'var(--text-strong)' }}
                >
                  {step.title}
                </div>
                <div
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}
                >
                  {step.description}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </VisualShell>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. AnalogyVisual                                                           */
/* -------------------------------------------------------------------------- */

export function AnalogyVisual({ data }: { data: AnalogyData }) {
  return (
    <VisualShell icon={Lightbulb} title={data.title} accent="var(--warning)" ariaLabel="Analogy">
      {/* Scenario banner */}
      <div
        className="mb-3 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
        style={{
          backgroundColor: tint('var(--warning)', 12),
          border: `1px solid ${tint('var(--warning)', 30)}`,
        }}
      >
        <Lightbulb className="h-4 w-4 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden />
        <span
          className="text-[13px] font-semibold italic"
          style={{ color: 'var(--text-strong)' }}
        >
          &ldquo;{data.scenario}&rdquo;
        </span>
      </div>

      {/* Concept → analogy mappings */}
      <div className="flex flex-col gap-2">
        {data.mappings.map((m, i) => (
          <div
            key={i}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: '1fr auto 1fr' }}
          >
            <span
              className="rounded-lg border px-2.5 py-2 text-center text-[13px] font-semibold"
              style={{
                backgroundColor: 'var(--surface-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-strong)',
                overflowWrap: 'anywhere',
              }}
            >
              {m.concept}
            </span>
            <ArrowRight
              className="h-[18px] w-[18px] shrink-0"
              style={{ color: 'var(--warning)' }}
              aria-hidden
            />
            <span
              className="rounded-lg px-2.5 py-2 text-center text-[13px] font-medium"
              style={{
                backgroundColor: tint('var(--warning)', 12),
                border: `1px solid ${tint('var(--warning)', 28)}`,
                color: 'var(--text-strong)',
                overflowWrap: 'anywhere',
              }}
            >
              {m.analogy}
            </span>
          </div>
        ))}
      </div>
    </VisualShell>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. MindMapVisual                                                           */
/* -------------------------------------------------------------------------- */

export function MindMapVisual({ data }: { data: MindMapData }) {
  return (
    <VisualShell icon={Network} title={data.title} ariaLabel="Mind map">
      {/* Central concept pill */}
      <div className="flex justify-center">
        <span
          className="inline-flex max-w-full items-center rounded-full px-4 py-2 text-center text-sm font-bold"
          style={{
            backgroundColor: 'var(--brand)',
            color: 'var(--surface-1)',
            boxShadow: `0 4px 12px ${tint('var(--brand)', 30)}`,
          }}
        >
          {data.center}
        </span>
      </div>

      {/* Trunk + horizontal distributor + branches (org-chart style) */}
      <div className="flex justify-center" aria-hidden>
        <div style={{ width: '2px', height: '16px', backgroundColor: 'var(--brand)', opacity: 0.35 }} />
      </div>
      <div
        aria-hidden
        style={{
          height: '2px',
          margin: '0 12px',
          backgroundColor: 'var(--brand)',
          opacity: 0.35,
        }}
      />

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
        }}
      >
        {data.branches.map((branch, i) => (
          <div key={i} className="flex flex-col items-center">
            {/* Drop connector from the distributor to the branch pill */}
            <div
              aria-hidden
              style={{ width: '2px', height: '12px', backgroundColor: 'var(--brand)', opacity: 0.35 }}
            />
            <span
              className="inline-flex max-w-full items-center rounded-full px-3.5 py-1.5 text-center text-[13px] font-semibold"
              style={{
                backgroundColor: tint('var(--brand)', 12),
                border: `1px solid ${tint('var(--brand)', 30)}`,
                color: 'var(--text-strong)',
              }}
            >
              {branch.label}
            </span>

            {branch.children && branch.children.length > 0 && (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {branch.children.map((child, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {child}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </VisualShell>
  )
}

/* -------------------------------------------------------------------------- */
/* 6. VisualRenderer — dispatcher                                             */
/* -------------------------------------------------------------------------- */

export function VisualRenderer({ data }: { data: VisualData }) {
  switch (data.type) {
    case 'flowchart':
      return <FlowchartVisual data={data} />
    case 'comparison':
      return <ComparisonTableVisual data={data} />
    case 'steps':
      return <StepsVisual data={data} />
    case 'analogy':
      return <AnalogyVisual data={data} />
    case 'mindmap':
      return <MindMapVisual data={data} />
    default:
      // Exhaustiveness guard — if a new visual type is added, TS errors here.
      const _exhaustive: never = data
      void _exhaustive
      return null
  }
}

export default VisualRenderer
