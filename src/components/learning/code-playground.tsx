'use client'

import { useState } from 'react'
import { Play, Terminal, Code2, Loader2, Copy, Check } from 'lucide-react'

const LANGUAGES = [
  { key: 'c', label: 'C', icon: '🔧' },
  { key: 'cpp', label: 'C++', icon: '⚡' },
  { key: 'python', label: 'Python', icon: '🐍' },
  { key: 'java', label: 'Java', icon: '☕' },
  { key: 'javascript', label: 'JavaScript', icon: '🟨' },
] as const

type LangKey = (typeof LANGUAGES)[number]['key']

const STARTER_CODE: Record<LangKey, string> = {
  c: `#include <stdio.h>

int main() {
    printf("Hello, Lernio!\\n");

    int a = 10, b = 20;
    printf("Sum: %d\\n", a + b);

    // Try a loop
    for (int i = 1; i <= 5; i++) {
        printf("Count: %d\\n", i);
    }

    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, Lernio!" << endl;

    int a = 10, b = 20;
    cout << "Sum: " << a + b << endl;

    // Try a vector
    vector<int> nums = {5, 2, 8, 1, 9};
    sort(nums.begin(), nums.end());
    cout << "Sorted: ";
    for (int n : nums) cout << n << " ";
    cout << endl;

    return 0;
}`,
  python: `# Hello, Lernio!
print("Hello, Lernio!")

# Try some math
a, b = 10, 20
print(f"Sum: {a + b}")

# Try a loop
for i in range(1, 6):
    print(f"Count: {i}")

# Try a list
nums = [5, 2, 8, 1, 9]
nums.sort()
print(f"Sorted: {nums}")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Lernio!");

        int a = 10, b = 20;
        System.out.println("Sum: " + (a + b));

        // Try a loop
        for (int i = 1; i <= 5; i++) {
            System.out.println("Count: " + i);
        }
    }
}`,
  javascript: `// Hello, Lernio!
console.log("Hello, Lernio!");

// Try some math
const a = 10, b = 20;
console.log("Sum:", a + b);

// Try a loop
for (let i = 1; i <= 5; i++) {
    console.log("Count:", i);
}

// Try an array
const nums = [5, 2, 8, 1, 9];
nums.sort((a, b) => a - b);
console.log("Sorted:", nums);`,
}

/**
 * Code playground with real code execution.
 * Supports C, C++, Python, Java, and JavaScript via the Piston API.
 */
export function CodePlayground({
  language = 'c',
  initialCode,
}: {
  language?: string
  initialCode?: string
}) {
  const [lang, setLang] = useState<LangKey>(
    (LANGUAGES.find((l) => l.key === language)?.key as LangKey) || 'c'
  )
  const [code, setCode] = useState(initialCode || STARTER_CODE[lang])
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  const switchLanguage = (newLang: LangKey) => {
    setLang(newLang)
    setCode(STARTER_CODE[newLang])
    setOutput('')
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('⏳ Running...')
    try {
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang }),
      })
      const data = await res.json()
      if (data.error) {
        setOutput(`❌ ${data.error}`)
      } else {
        setOutput(data.output || 'No output')
      }
    } catch {
      setOutput('❌ Error: Could not run code. Check your connection.')
    } finally {
      setRunning(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header with language selector + run button */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-green-500" />
          {/* Language selector */}
          <div className="flex gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.key}
                onClick={() => switchLanguage(l.key)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  lang === l.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {l.icon} {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={runCode}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Code editor */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={12}
        className="w-full bg-zinc-900 p-3 font-mono text-xs text-green-400 outline-none resize-y"
        spellCheck={false}
        placeholder={`Write your ${LANGUAGES.find((l) => l.key === lang)?.label} code here...`}
      />

      {/* Output panel */}
      {output && (
        <div className="border-t border-border bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Terminal className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Output</span>
          </div>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono max-h-64 overflow-auto">{output}</pre>
        </div>
      )}
    </div>
  )
}
