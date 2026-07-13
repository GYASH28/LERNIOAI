'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { ClassAvatar } from './class-avatar'

interface ClassIdentity {
  id: string
  alias?: string | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  division?: string | null
  semesterNumber?: number | null
}

export function ClassIdentityEditor({
  classData,
  canEdit,
  onSaved,
}: {
  classData: ClassIdentity
  canEdit: boolean
  onSaved?: (updated: ClassIdentity) => void
}) {
  const [open, setOpen] = useState(false)
  const [alias, setAlias] = useState(classData.alias || '')
  const [emoji, setEmoji] = useState(classData.avatarEmoji || '')
  const [color, setColor] = useState(classData.avatarColor || '#7C3AED')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setAlias(classData.alias || '')
    setEmoji(classData.avatarEmoji || '')
    setColor(classData.avatarColor || '#7C3AED')
  }, [classData.id, classData.alias, classData.avatarEmoji, classData.avatarColor])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/class', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          alias: alias.trim() || null,
          avatarEmoji: emoji || null,
          avatarColor: color || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save')
      onSaved?.(data.data)
      setOpen(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        title="Edit class identity"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Class Identity
              </h3>
              <button
                onClick={() => !saving && setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                <ClassAvatar
                  emoji={emoji || undefined}
                  color={color}
                  division={classData.division}
                  semesterNumber={classData.semesterNumber}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">
                    {alias.trim() || `Division ${classData.division || '?'}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Live preview</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Friendly alias
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.slice(0, 60))}
                  placeholder="e.g. Toppers of 2026"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  maxLength={60}
                  disabled={saving}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{alias.length}/60</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  Avatar emoji
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {['🚀', '🔥', '⭐', '🎯', '🏆', '💎', '👑', '🦾', '📚', '🧠', '⚡', '🌱', '🦅', '🐉', '🌟', '🛡️'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(emoji === em ? '' : em)}
                      className={`flex h-9 items-center justify-center rounded-md border text-lg transition-colors ${
                        emoji === em ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent/50'
                      }`}
                      disabled={saving}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
                  placeholder="Or paste any emoji"
                  className="mt-2 w-32 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                  maxLength={8}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  Avatar color
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { hex: '#7C3AED', name: 'Violet' },
                    { hex: '#EC4899', name: 'Pink' },
                    { hex: '#F59E0B', name: 'Amber' },
                    { hex: '#10B981', name: 'Emerald' },
                    { hex: '#3B82F6', name: 'Blue' },
                    { hex: '#EF4444', name: 'Red' },
                    { hex: '#8B5CF6', name: 'Purple' },
                    { hex: '#06B6D4', name: 'Cyan' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        color.toLowerCase() === c.hex.toLowerCase() ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Save identity
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
