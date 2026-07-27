'use client'

import { useMemo } from 'react'

/**
 * Native HTML/CSS flowchart renderer.
 *
 * Parses a SUBSET of Mermaid flowchart syntax (enough for our lesson notes):
 *   flowchart TD|LR
 *   A[Label] --> B[Label]
 *   A -->|text| B
 *   A --> B
 *   C{Decision} -->|Yes| D
 *   C -->|No| E
 *   E[(Database)]
 *
 * Renders as styled HTML nodes with CSS arrows. Never throws — if parsing
 * fails, the diagram falls back to a styled <pre> block (no Mermaid errors
 * ever surface to the student).
 *
 * This replaces the Mermaid library entirely.
 */

interface FlowNode {
  id: string
  label: string
  shape: 'rect' | 'round' | 'decision' | 'database' | 'circle'
}

interface FlowEdge {
  from: string
  to: string
  label?: string
}

interface ParsedFlow {
  direction: 'TD' | 'LR'
  nodes: Map<string, FlowNode>
  edges: FlowEdge[]
}

const SHAPE_PATTERNS: Array<{ regex: RegExp; shape: FlowNode['shape'] }> = [
  { regex: /^\((.+)\)$/, shape: 'circle' },         // (text)
  { regex: /^\[(.+)\]$/, shape: 'rect' },            // [text]
  { regex: /^\((.+)\)$/, shape: 'round' },           // (text) — also round
  { regex: /^\(([^)]+)\)$/, shape: 'round' },        // (text)
  { regex: /^\{(.+)\}$/, shape: 'decision' },        // {text}
  { regex: /^\(\((.+)\)\)$/, shape: 'circle' },      // ((text))
  { regex: /^\[(.+)\]$/, shape: 'rect' },
  { regex: /^\[\((.+)\)\]$/, shape: 'database' },    // [(text)]
]

function parseNode(token: string): { id: string; label: string; shape: FlowNode['shape'] } {
  const trimmed = token.trim()
  // id[label] or id(shape) or id{decision} or id[(db)] or just id
  const match = trimmed.match(/^([A-Za-z0-9_]+)(.*)$/)
  if (!match) {
    return { id: trimmed, label: trimmed, shape: 'rect' }
  }
  const id = match[1]
  const rest = match[2].trim()
  if (!rest) {
    return { id, label: id, shape: 'rect' }
  }
  for (const { regex, shape } of SHAPE_PATTERNS) {
    const m = rest.match(regex)
    if (m) {
      return { id, label: m[1].replace(/"/g, ''), shape }
    }
  }
  return { id, label: rest.replace(/[[\](){}]/g, '').replace(/"/g, ''), shape: 'rect' }
}

function parseFlowchart(source: string): ParsedFlow | null {
  const lines = source.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const firstLine = lines[0]
  const dirMatch = firstLine.match(/^flowchart\s+(TD|LR|TB|RL|BT)/i)
  const direction: 'TD' | 'LR' = dirMatch
    ? (dirMatch[1].toUpperCase() === 'TB' ? 'TD' : dirMatch[1].toUpperCase() === 'RL' || dirMatch[1].toUpperCase() === 'BT' ? 'TD' : dirMatch[1].toUpperCase() as 'TD' | 'LR')
    : 'TD'

  const startIdx = dirMatch ? 1 : 0
  const nodes = new Map<string, FlowNode>()
  const edges: FlowEdge[] = []

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    // Split on --> with optional |label|
    // Pattern: A[Label] -->|text| B[Label]
    const edgeParts = line.split('-->')
    if (edgeParts.length >= 2) {
      for (let j = 0; j < edgeParts.length - 1; j++) {
        const leftRaw = edgeParts[j].trim()
        const rightRaw = edgeParts[j + 1].trim()
        // Extract edge label: |text|
        const labelMatch = rightRaw.match(/^\|(.+?)\|\s*(.*)$/)
        const edgeLabel = labelMatch ? labelMatch[1].replace(/"/g, '') : undefined
        const rightToken = labelMatch ? labelMatch[2] : rightRaw

        // The left side may have a trailing edge label from previous split
        const leftToken = leftRaw.replace(/^\|(.+?)\|\s*/, '')

        const leftNode = parseNode(leftToken)
        const rightNode = parseNode(rightToken)

        if (!nodes.has(leftNode.id)) {
          nodes.set(leftNode.id, { id: leftNode.id, label: leftNode.label, shape: leftNode.shape })
        }
        if (!nodes.has(rightNode.id)) {
          nodes.set(rightNode.id, { id: rightNode.id, label: rightNode.label, shape: rightNode.shape })
        }
        edges.push({ from: leftNode.id, to: rightNode.id, label: edgeLabel })
      }
    } else {
      // Standalone node definition: A[Label]
      const node = parseNode(line)
      if (!nodes.has(node.id)) {
        nodes.set(node.id, { id: node.id, label: node.label, shape: node.shape })
      }
    }
  }

  if (nodes.size === 0) return null
  return { direction, nodes, edges }
}

export interface NativeFlowchartProps {
  source: string
  title?: string
}

export function NativeFlowchart({ source, title }: NativeFlowchartProps) {
  const parsed = useMemo(() => parseFlowchart(source), [source])

  if (!parsed) {
    // Fallback: render as styled pre block (never show Mermaid error)
    return (
      <div className="native-diagram native-diagram--fallback">
        {title && <div className="native-diagram__title">{title}</div>}
        <pre className="native-diagram__pre">{source}</pre>
      </div>
    )
  }

  const { direction, nodes, edges } = parsed
  const isVertical = direction === 'TD'
  const nodeArray = Array.from(nodes.values())

  // Build adjacency for layering (simple topological-ish by appearance order)
  const layerMap = new Map<string, number>()
  nodeArray.forEach((n, i) => layerMap.set(n.id, i))

  return (
    <div className="native-diagram" data-direction={direction}>
      {title && <div className="native-diagram__title">{title}</div>}
      <div
        className={`native-flowchart ${isVertical ? 'native-flowchart--vertical' : 'native-flowchart--horizontal'}`}
      >
        {nodeArray.map((node) => {
          const outgoing = edges.filter((e) => e.from === node.id)
          return (
            <div key={node.id} className="native-flowchart__node-group">
              <NodeShape node={node} />
              {outgoing.length > 0 && (
                <div className={`native-flowchart__edges ${isVertical ? 'native-flowchart__edges--vertical' : 'native-flowchart__edges--horizontal'}`}>
                  {outgoing.map((edge, i) => {
                    const target = nodes.get(edge.to)
                    if (!target) return null
                    return (
                      <div key={i} className="native-flowchart__edge-group">
                        <div className="native-flowchart__arrow">
                          {isVertical ? '↓' : '→'}
                          {edge.label && <span className="native-flowchart__edge-label">{edge.label}</span>}
                        </div>
                        <NodeShape node={target} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="native-diagram__explanation">
        Diagram showing the flow of {title || 'the process'}. Follow the arrows from top to bottom{isVertical ? '' : ' (left to right)'} to understand the sequence.
      </p>
    </div>
  )
}

function NodeShape({ node }: { node: FlowNode }) {
  const className = `native-flowchart__node native-flowchart__node--${node.shape}`
  return (
    <div className={className} title={node.label}>
      <span>{node.label}</span>
    </div>
  )
}
