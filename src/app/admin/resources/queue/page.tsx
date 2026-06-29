import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Link2, ShieldCheck } from 'lucide-react'
import { requireActiveRole } from '@/lib/auth'
import {
  listResourceProviders,
  listResourceReviewQueue,
  reviewResource,
  upsertResourceProvider,
} from '@/lib/resources/resource-governance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Resource Review Queue' }

async function saveProvider(formData: FormData) {
  'use server'
  const authority = await requireActiveRole('admin')
  await upsertResourceProvider(
    {
      key: String(formData.get('key') || ''),
      name: String(formData.get('name') || ''),
      providerType: String(formData.get('providerType') || 'external'),
      baseUrl: clean(formData.get('baseUrl')),
      policyJson: clean(formData.get('policyJson')),
      status: String(formData.get('status') || 'active') as 'active' | 'paused' | 'disabled',
    },
    authority.user.id,
  )
  revalidatePath('/admin/resources/queue')
}

async function review(formData: FormData) {
  'use server'
  const authority = await requireActiveRole('admin')
  await reviewResource(
    {
      resourceId: String(formData.get('resourceId') || ''),
      decision: String(formData.get('decision') || 'changes_requested') as
        | 'approved'
        | 'rejected'
        | 'changes_requested'
        | 'held',
      note: clean(formData.get('note')),
    },
    authority.user.id,
  )
  revalidatePath('/admin/resources/queue')
}

export default async function AdminResourceQueuePage() {
  await requireActiveRole('admin')
  const [{ resources }, providers] = await Promise.all([
    listResourceReviewQueue({ pageSize: 50 }),
    listResourceProviders(),
  ])

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Admin / Resource Intelligence
          </div>
          <h1 className="text-3xl font-black tracking-normal">Resource Review Queue</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Review resource quality, link health, and syllabus fit separately from moderation holds.
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/resources/youtube-candidates">Open YouTube candidate queue</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_minmax(0,1fr)] sm:px-6 lg:px-8">
        <div className="grid content-start gap-6">
          <Card surface="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                Provider Policy
              </CardTitle>
              <CardDescription>Register official and curated resource providers.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveProvider} className="grid gap-4">
                <Field label="Provider key">
                  <Input name="key" placeholder="nptel" required />
                </Field>
                <Field label="Name">
                  <Input name="name" placeholder="NPTEL" required />
                </Field>
                <Field label="Type">
                  <select name="providerType" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="official_course">Official course</option>
                    <option value="video_platform">Video platform</option>
                    <option value="institutional">Institutional</option>
                    <option value="external">External</option>
                  </select>
                </Field>
                <Field label="Base URL">
                  <Input name="baseUrl" type="url" placeholder="https://nptel.ac.in" />
                </Field>
                <Field label="Policy JSON">
                  <Textarea name="policyJson" placeholder='{"manualSubmission":true,"copyright":"link-only"}' />
                </Field>
                <input type="hidden" name="status" value="active" />
                <Button type="submit">Save provider</Button>
              </form>
            </CardContent>
          </Card>

          <Card surface="panel">
            <CardHeader>
              <CardTitle>Active Providers</CardTitle>
              <CardDescription>{providers.length} provider policies configured.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {providers.map((provider) => (
                <div key={provider.id} className="rounded-md border border-border/70 p-3">
                  <div className="font-semibold">{provider.name}</div>
                  <div className="text-muted-foreground">{provider.key} / {provider.providerType}</div>
                </div>
              ))}
              {providers.length === 0 && <p className="text-sm text-muted-foreground">No providers configured yet.</p>}
            </CardContent>
          </Card>
        </div>

        <Card surface="panel">
          <CardHeader>
            <CardTitle>Pending Review</CardTitle>
            <CardDescription>{resources.length} resources waiting for quality decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Mappings</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="font-medium">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">{resource.canonicalUrl ?? resource.url ?? resource.provider ?? 'Manual resource'}</div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {resource.subject.code}
                      <div className="text-xs text-muted-foreground">{resource.subject.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{resource.linkHealth}</Badge>
                    </TableCell>
                    <TableCell>{resource._count.topicMappings}</TableCell>
                    <TableCell>
                      <form action={review} className="flex flex-wrap gap-2">
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <input type="hidden" name="note" value="Reviewed from admin resource queue." />
                        <Button size="sm" name="decision" value="approved" type="submit">Approve</Button>
                        <Button size="sm" variant="outline" name="decision" value="changes_requested" type="submit">
                          Changes
                        </Button>
                        <Button size="sm" variant="outline" name="decision" value="held" type="submit">
                          Hold
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {resources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No resources are waiting for review.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-2">
      <span>{label}</span>
      {children}
    </Label>
  )
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? text : null
}
