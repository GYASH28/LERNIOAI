import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { CodePlayground } from '@/components/learning/code-playground'

export const dynamic = 'force-dynamic'

export default async function CodingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/coding')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Coding Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">Write and run code directly in your browser. Practice C, C++, Python, and Java.</p>
        <div className="mt-6 space-y-4">
          <CodePlayground language="c" initialCode={'#include <stdio.h>\n\nint main() {\n    printf("Hello, Lernio!\\n");\n    \n    // Try writing your code here\n    int a = 10, b = 20;\n    printf("Sum: %d\\n", a + b);\n    \n    return 0;\n}'} />
        </div>
      </div>
    </main>
  )
}
