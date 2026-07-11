import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, Printer, ShieldCheck } from 'lucide-react'
import { loadLessonNotePreview } from '@/lib/lesson-notes/lesson-note-files'
import { renderLessonNoteHtml } from '@/lib/lesson-notes/lesson-note-document'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
} from '@/lib/learning/learning-ops-authority'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Lesson Note Preview' }

export default async function AdminLessonNotePreviewPage({
  params,
}: {
  params: Promise<{ noteSlug: string }>
}) {
  const access = await requireLearningOpsPreviewAccess()
  const { noteSlug } = await params
  const preview = loadLessonNotePreview(noteSlug)
  if (!preview) notFound()
  if (!matchesLearningOpsReportScope(access.reportScope, {
    programmeCode: preview.document.programmeCode,
    subjectCode: preview.document.subjectCode,
  })) {
    notFound()
  }

  const html = renderLessonNoteHtml(preview.document)

  return (
    <CampusmateAdminShell user={{ name: access.authority.user.name, email: access.authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <Link href="/admin/learning/coverage" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Learning coverage
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-4 w-4" />
                Review Preview
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{preview.document.lessonTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {preview.document.programmeCode} / Semester {preview.document.semesterNumber} / {preview.document.subjectCode} / Unit {preview.document.unitNumber}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{access.summary}</p>
            </div>
            <Button asChild>
              <Link href={`/admin/learning/notes/${preview.slug}/print`} target="_blank">
                <Printer className="h-4 w-4" />
                Print HTML
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card surface="panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Document State
              </CardTitle>
              <CardDescription>Validated note JSON before reviewer publication.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Info label="Type" value={preview.document.documentType} />
              <Info label="Template" value={preview.document.templateVersion} />
              <Info label="Version" value={`v${preview.document.version}`} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{preview.document.verificationStatus}</Badge>
              </div>
              <Info label="Sections" value={preview.document.sections.length} />
              <Info label="Sources" value={preview.document.sources.length} />
            </CardContent>
          </Card>

          <Card surface="elevated" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Rendered Preview</CardTitle>
              <CardDescription>Escaped, print-safe HTML generated from the validated note document.</CardDescription>
            </CardHeader>
            <CardContent>
              <iframe
                title={`Preview of ${preview.document.lessonTitle}`}
                srcDoc={html}
                className="h-[760px] w-full rounded-lg border border-border bg-white"
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusmateAdminShell>
  )
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
