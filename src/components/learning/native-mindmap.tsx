'use client'

import { useMemo } from 'react'

/**
 * Native HTML/CSS mind-map / hierarchy renderer.
 *
 * Parses a SUBSET of Mermaid mindmap syntax:
 *   mindmap
 *   root((Topic))
 *     Branch1
 *       Sub-branch
 *     Branch2
 *       Leaf
 *
 * Indentation (2 spaces per level) defines the tree. Never throws — falls
 * back to a styled <pre> if parsing fails. Replaces Mermaid entirely.
 */

interface MindNode {
  label: string
  level: number
  children: MindNode[]
}

function parseMindmap(source: string): MindNode | null {
  const lines = source.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return null

  // Skip "mindmap" header
  const startIdx = lines[0].trim().toLowerCase().startsWith('mindmap') ? 1 : 0

  const root: MindNode | null = null
  const stack: MindNode[] = []

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    // Count leading spaces (indentation level)
    const match = line.match(/^(\s*)(.+)$/)
    if (!match) continue
    const indent = match[1].length
    const level = Math.floor(indent / 2)
    // Clean the label: remove root(()), ((text)), etc.
    let label = match[2].trim()
    label = label.replace(/^root\(\((.+)\)\)$/, '$1')
    label = label.replace(/^\(\((.+)\)\)$/, '$1')
    label = label.replace(/^\((.+)\)$/, '$1')
    label = label.replace(/^\[(.+)\]$/, '$1')
    label = label.replace(/^\{(.+)\}$/, '$1')
    label = label.replace(/"/g, '')

    const node: MindNode = { label, level, children: [] }

    if (stack.length === 0) {
      stack.push(node)
    } else {
      // Pop until we find the parent (a node with smaller level)
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }
      const parent = stack[stack.length - 1]
      if (parent) {
        parent.children.push(node)
      }
      stack.push(node)
    }
  }

  return stack[0] || root
}

export interface NativeMindmapProps {
  source: string
  title?: string
}

export function NativeMindmap({ source, title }: NativeMindmapProps) {
  const root = useMemo(() => parseMindmap(source), [source])

  if (!root) {
    return (
      <div className="native-diagram native-diagram--fallback">
        {title && <div className="native-diagram__title">{title}</div>}
        <pre className="native-diagram__pre">{source}</pre>
      </div>
    )
  }

  return (
    <div className="native-diagram">
      {title && <div className="native-diagram__title">{title}</div>}
      <div className="native-mindmap">
        <MindmapNode node={root} isRoot />
      </div>
      <p className="native-diagram__explanation">
        Concept map for {title || root.label}. The central topic branches into related sub-topics — explore each branch to understand the full picture.
      </p>
    </div>
  )
}

function MindmapNode({ node, isRoot }: { node: MindNode; isRoot?: boolean }) {
  return (
    <div className={`native-mindmap__node ${isRoot ? 'native-mindmap__node--root' : ''}`}>
      <div className={`native-mindmap__label ${isRoot ? 'native-mindmap__label--root' : ''}`}>
        {node.label}
      </div>
      {node.children.length > 0 && (
        <div className="native-mindmap__children">
          {node.children.map((child, i) => (
            <MindmapNode key={i} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}
