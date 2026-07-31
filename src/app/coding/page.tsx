import { redirect } from 'next/navigation'
import { Code2, Lightbulb, BookOpen } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { CodePlayground } from '@/components/learning/code-playground'
import { AuthenticatedPageShell } from '@/components/app/authenticated-page-shell'

export const dynamic = 'force-dynamic'

export default async function CodingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/coding')

  return (
    <AuthenticatedPageShell current="coding" maxWidth="5xl">
      <header className="mb-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-500/10">
            <Code2 className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Coding Lab</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Write, run and debug real code. Save useful mistakes to the Notebook and return to the lesson that introduced the concept.
            </p>
          </div>
        </div>
      </header>

      <CodePlayground language="c" />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black">Quick workflow</h2>
          </div>
          <ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            <li>1. Predict the output before running the program.</li>
            <li>2. Run it and compare the real output.</li>
            <li>3. Debug one cause at a time instead of rewriting everything.</li>
            <li>4. Record the mistake or rule in your Notebook.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black">Starter challenges</h2>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            <li><strong>FizzBuzz:</strong> practise conditions and loops.</li>
            <li><strong>Factorial:</strong> compare iterative and recursive thinking.</li>
            <li><strong>Prime check:</strong> improve test cases and boundaries.</li>
            <li><strong>Array sum:</strong> trace indexes and accumulation.</li>
          </ul>
        </section>
      </div>
    </AuthenticatedPageShell>
  )
}
