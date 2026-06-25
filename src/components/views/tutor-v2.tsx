'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, Plus, Send, Square } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TUTOR_MODES, type TutorMessage, type TutorMode, type TutorSession } from '@/lib/types'

const QUICK = [
  'Explain this simply with one example.',
  'Create short exam notes.',
  'Quiz me one question at a time.',
]

export function TutorView() {
  const { subjects } = useAppStore()
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [subjectId, setSubjectId] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const subject = useMemo(() => subjects.find((item) => item.id === subjectId), [subjects, subjectId])

  useEffect(() => {
    void fetch('/api/tutor/session')
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok) return
        const loaded = payload.data as TutorSession[]
        setSessions(loaded)
        if (loaded[0]) {
          setSessionId(loaded[0].id)
          setMessages(loaded[0].messages || [])
          setMode((loaded[0].mode as TutorMode) || 'explain_simple')
          setSubjectId(loaded[0].subjectId || '')
        }
      })
  }, [])

  async function createSession() {
    const response = await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New session', mode, subjectId: subjectId || undefined }),
    })
    const payload = await response.json()
    if (!payload.ok) return ''
    const session = payload.data as TutorSession
    setSessions((current) => [session, ...current])
    setSessionId(session.id)
    setMessages([])
    return session.id
  }

  async function send(text = draft) {
    const clean = text.trim()
    if (!clean || sending) return
    let id = sessionId
    if (!id) id = await createSession()
    if (!id) return
    const pending: TutorMessage = { id: `pending-${Date.now()}`, role: 'user', content: clean, mode }
    setDraft('')
    setMessages((current) => [...current, pending])
    setSending(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ sessionId: id, message: clean, mode, subjectName: subject?.name }),
      })
      const payload = await response.json()
      if (payload.ok) setMessages((current) => [...current, payload.data.message as TutorMessage])
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="hidden min-h-[680px] p-3 lg:block">
        <Button className="mb-3 w-full" onClick={() => void createSession()}><Plus className="mr-2 h-4 w-4" />New session</Button>
        <div className="space-y-1">{sessions.map((item) => <button key={item.id} onClick={() => { setSessionId(item.id); setMessages(item.messages || []); setMode(item.mode as TutorMode); setSubjectId(item.subjectId || '') }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">{item.title}</button>)}</div>
      </Card>
      <Card className="flex min-h-[680px] min-w-0 flex-col overflow-hidden">
        <div className="border-b bg-muted/20 p-4">
          <div className="flex items-center gap-3"><Mascot mascot="leo" state="greeting" size={42} /><div><h2 className="font-bold">LEO AI Tutor</h2><p className="text-xs text-muted-foreground">Fast, focused answers powered by Groq</p></div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={mode} onValueChange={(value) => setMode(value as TutorMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TUTOR_MODES.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select>
            <Select value={subjectId || undefined} onValueChange={setSubjectId}><SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent>{subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} · {item.name}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><Mascot mascot="leo" state="greeting" size={86} /><h3 className="mt-4 text-2xl font-bold">What should we learn?</h3><div className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-3">{QUICK.map((item) => <button key={item} onClick={() => void send(item)} className="rounded-xl border p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5">{item}</button>)}</div></div> : <div className="mx-auto max-w-4xl space-y-4">{messages.map((item) => item.role === 'user' ? <div key={item.id} className="flex justify-end"><div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">{item.content}</div></div> : <div key={item.id} className="rounded-2xl border bg-background p-4"><div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{item.content}</ReactMarkdown></div></div>)}{sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />LEO is thinking…</div>}</div>}
        </div>
        <div className="border-t p-3"><div className="mx-auto max-w-4xl rounded-2xl border p-2"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} placeholder="Ask LEO anything about your studies…" className="min-h-[76px] resize-none border-0 shadow-none focus-visible:ring-0" /><div className="flex justify-end">{sending ? <Button variant="destructive" size="sm" onClick={() => abortRef.current?.abort()}><Square className="mr-2 h-4 w-4" />Stop</Button> : <Button size="sm" disabled={!draft.trim()} onClick={() => void send()}><Send className="mr-2 h-4 w-4" />Send</Button>}</div></div></div>
      </Card>
    </div>
  )
}
