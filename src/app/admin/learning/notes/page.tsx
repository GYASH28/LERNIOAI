import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ShieldCheck } from 'lucide-react'
import { requireActiveRole } from '@/lib/auth'
import { listLessonNotePreviews } from '@/lib/lesson-notes/lesson-note-files'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Lesson Note Previews' }

export default async function AdminLessonNotesPage() {
  const authority = await requireActiveRole('admin')
  const previews = listLessonNotePreviews()

  return (
    <CampusmateAdminShell user={{ name: authority.user.name, email: authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Learning OS
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Lesson Note Previews</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Validate and preview generated note JSON before reviewer approval, PDF rendering or student publication.
          </p>
        </section>

        <Card surface="panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Valid Note Documents
            </CardTitle>
            <CardDescription>{previews.length} validated note document(s) found under content/lesson-notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previews.map((preview) => (
                  <TableRow key={preview.slug}>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="font-semibold">{preview.document.lessonTitle}</div>
                      <div className="text-xs text-muted-foreground">{preview.document.lessonSlug}</div>
                    </TableCell>
                    <TableCell>
                      {preview.document.programmeCode} / Sem {preview.document.semesterNumber}
                      <div className="text-xs text-muted-foreground">{preview.document.subjectCode} / Unit {preview.document.unitNumber}</div>
                    </TableCell>
                    <TableCell>{preview.document.documentType}</TableCell>
                    <TableCell><Badge variant="secondary">{preview.document.verificationStatus}</Badge></TableCell>
                    <TableCell>v{preview.document.version}</TableCell>
                    <TableCell>
                      <Button asChild size="sm">
                        <Link href={`/admin/learning/notes/${preview.slug}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {previews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No valid lesson note JSON files are present yet. Generate or add reviewed drafts under content/lesson-notes, then run npm run notes:validate.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </CampusmateAdminShell>
  )
}
