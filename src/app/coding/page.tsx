import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { CodePlayground } from '@/components/learning/code-playground'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { Code2, Lightbulb, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CodingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/coding')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Code2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Coding Lab</h1>
                  <p className="text-sm text-muted-foreground">
                    Write and run real code in C, C++, Python, Java, and JavaScript.
                  </p>
                </div>
              </div>
            </div>

            {/* Code playground */}
            <CodePlayground language="c" />

            {/* Tips section */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Quick Tips</h3>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>• Switch languages using the tabs above the editor</li>
                  <li>• Click <strong>Run</strong> to compile and execute your code</li>
                  <li>• Output appears in the terminal below the editor</li>
                  <li>• Execution timeout is 5 seconds — avoid infinite loops</li>
                  <li>• Use <strong>Copy</strong> to copy your code</li>
                </ul>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Try These Challenges</h3>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>• <strong>FizzBuzz:</strong> Print 1-20, replace multiples of 3 with "Fizz", 5 with "Buzz"</li>
                  <li>• <strong>Factorial:</strong> Calculate 5! = 120 using a loop</li>
                  <li>• <strong>Prime check:</strong> Check if 17 is prime</li>
                  <li>• <strong>Reverse string:</strong> Reverse "Lernio" to "oinreL"</li>
                  <li>• <strong>Array sum:</strong> Sum the array [1, 2, 3, 4, 5]</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
