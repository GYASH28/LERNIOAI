'use client'

import { useState, useCallback, useRef } from 'react'
import { Play, Terminal, Code2, Loader2, Copy, Check, Maximize2, Minimize2, RotateCcw, BookOpen } from 'lucide-react'

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
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, Lernio!" << endl;
    return 0;
}`,
  python: `print("Hello, Lernio!")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Lernio!");
    }
}`,
  javascript: `console.log("Hello, Lernio!");`,
}

interface CodeExample {
  name: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  code: Record<LangKey, string>
}

const EXAMPLES: CodeExample[] = [
  {
    name: 'FizzBuzz',
    difficulty: 'Easy',
    description: 'Print 1-20. Replace multiples of 3 with "Fizz", 5 with "Buzz", both with "FizzBuzz".',
    code: {
      c: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 20; i++) {
        if (i % 15 == 0) printf("FizzBuzz\\n");
        else if (i % 3 == 0) printf("Fizz\\n");
        else if (i % 5 == 0) printf("Buzz\\n");
        else printf("%d\\n", i);
    }
    return 0;
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 20; i++) {
        if (i % 15 == 0) cout << "FizzBuzz" << endl;
        else if (i % 3 == 0) cout << "Fizz" << endl;
        else if (i % 5 == 0) cout << "Buzz" << endl;
        else cout << i << endl;
    }
    return 0;
}`,
      python: `for i in range(1, 21):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
      java: `public class Main {
    public static void main(String[] args) {
        for (int i = 1; i <= 20; i++) {
            if (i % 15 == 0) System.out.println("FizzBuzz");
            else if (i % 3 == 0) System.out.println("Fizz");
            else if (i % 5 == 0) System.out.println("Buzz");
            else System.out.println(i);
        }
    }
}`,
      javascript: `for (let i = 1; i <= 20; i++) {
    if (i % 15 === 0) console.log("FizzBuzz");
    else if (i % 3 === 0) console.log("Fizz");
    else if (i % 5 === 0) console.log("Buzz");
    else console.log(i);
}`,
    },
  },
  {
    name: 'Factorial',
    difficulty: 'Easy',
    description: 'Calculate the factorial of 5 (5! = 120) using a loop.',
    code: {
      c: `#include <stdio.h>

int main() {
    int n = 5, fact = 1;
    for (int i = 1; i <= n; i++) {
        fact *= i;
    }
    printf("%d! = %d\\n", n, fact);
    return 0;
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n = 5, fact = 1;
    for (int i = 1; i <= n; i++) fact *= i;
    cout << n << "! = " << fact << endl;
    return 0;
}`,
      python: `n = 5
fact = 1
for i in range(1, n + 1):
    fact *= i
print(f"{n}! = {fact}")`,
      java: `public class Main {
    public static void main(String[] args) {
        int n = 5, fact = 1;
        for (int i = 1; i <= n; i++) fact *= i;
        System.out.println(n + "! = " + fact);
    }
}`,
      javascript: `const n = 5;
let fact = 1;
for (let i = 1; i <= n; i++) fact *= i;
console.log(n + "! = " + fact);`,
    },
  },
  {
    name: 'Prime Check',
    difficulty: 'Medium',
    description: 'Check if a number is prime. Test with 17 and 18.',
    code: {
      c: `#include <stdio.h>
#include <stdbool.h>

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int nums[] = {17, 18};
    for (int i = 0; i < 2; i++) {
        printf("%d is %s\\n", nums[i], isPrime(nums[i]) ? "prime" : "not prime");
    }
    return 0;
}`,
      cpp: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}

int main() {
    int nums[] = {17, 18};
    for (int n : nums)
        cout << n << " is " << (isPrime(n) ? "prime" : "not prime") << endl;
    return 0;
}`,
      python: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

for n in [17, 18]:
    print(f"{n} is {'prime' if is_prime(n) else 'not prime'}")`,
      java: `public class Main {
    static boolean isPrime(int n) {
        if (n < 2) return false;
        for (int i = 2; i * i <= n; i++)
            if (n % i == 0) return false;
        return true;
    }
    public static void main(String[] args) {
        int[] nums = {17, 18};
        for (int n : nums)
            System.out.println(n + " is " + (isPrime(n) ? "prime" : "not prime"));
    }
}`,
      javascript: `function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
    }
    return true;
}

[17, 18].forEach(n => {
    console.log(n + " is " + (isPrime(n) ? "prime" : "not prime"));
});`,
    },
  },
  {
    name: 'Reverse String',
    difficulty: 'Easy',
    description: 'Reverse a string without using built-in reverse functions.',
    code: {
      c: `#include <stdio.h>
#include <string.h>

int main() {
    char str[] = "Lernio";
    int len = strlen(str);
    for (int i = 0; i < len / 2; i++) {
        char temp = str[i];
        str[i] = str[len - 1 - i];
        str[len - 1 - i] = temp;
    }
    printf("Reversed: %s\\n", str);
    return 0;
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string str = "Lernio";
    int n = str.length();
    for (int i = 0; i < n / 2; i++) {
        swap(str[i], str[n - 1 - i]);
    }
    cout << "Reversed: " << str << endl;
    return 0;
}`,
      python: `text = "Lernio"
reversed_text = ""
for char in text:
    reversed_text = char + reversed_text
print(f"Reversed: {reversed_text}")`,
      java: `public class Main {
    public static void main(String[] args) {
        String str = "Lernio";
        char[] chars = str.toCharArray();
        int n = chars.length;
        for (int i = 0; i < n / 2; i++) {
            char temp = chars[i];
            chars[i] = chars[n - 1 - i];
            chars[n - 1 - i] = temp;
        }
        System.out.println("Reversed: " + new String(chars));
    }
}`,
      javascript: `const str = "Lernio";
let reversed = "";
for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
}
console.log("Reversed: " + reversed);`,
    },
  },
  {
    name: 'Array Sum & Average',
    difficulty: 'Easy',
    description: 'Calculate the sum and average of an array of numbers.',
    code: {
      c: `#include <stdio.h>

int main() {
    int arr[] = {1, 2, 3, 4, 5};
    int n = sizeof(arr) / sizeof(arr[0]);
    int sum = 0;
    for (int i = 0; i < n; i++) sum += arr[i];
    float avg = (float)sum / n;
    printf("Sum: %d\\n", sum);
    printf("Average: %.2f\\n", avg);
    return 0;
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> arr = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : arr) sum += n;
    float avg = (float)sum / arr.size();
    cout << "Sum: " << sum << endl;
    cout << "Average: " << avg << endl;
    return 0;
}`,
      python: `arr = [1, 2, 3, 4, 5]
total = sum(arr)
avg = total / len(arr)
print(f"Sum: {total}")
print(f"Average: {avg}")`,
      java: `public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : arr) sum += n;
        double avg = (double) sum / arr.length;
        System.out.println("Sum: " + sum);
        System.out.println("Average: " + avg);
    }
}`,
      javascript: `const arr = [1, 2, 3, 4, 5];
const sum = arr.reduce((a, b) => a + b, 0);
const avg = sum / arr.length;
console.log("Sum: " + sum);
console.log("Average: " + avg);`,
    },
  },
  {
    name: 'Bubble Sort',
    difficulty: 'Medium',
    description: 'Sort an array using bubble sort algorithm.',
    code: {
      c: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubbleSort(arr, n);
    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (arr[j] > arr[j + 1])
                swap(arr[j], arr[j + 1]);
}

int main() {
    vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(arr);
    cout << "Sorted: ";
    for (int n : arr) cout << n << " ";
    cout << endl;
    return 0;
}`,
      python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]

arr = [64, 34, 25, 12, 22, 11, 90]
bubble_sort(arr)
print("Sorted:", arr)`,
      java: `public class Main {
    static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++)
            for (int j = 0; j < n - i - 1; j++)
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
    }
    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(arr);
        System.out.print("Sorted: ");
        for (int n : arr) System.out.print(n + " ");
        System.out.println();
    }
}`,
      javascript: `function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
}

const arr = [64, 34, 25, 12, 22, 11, 90];
bubbleSort(arr);
console.log("Sorted: " + arr.join(" "));`,
    },
  },
  {
    name: 'Fibonacci Series',
    difficulty: 'Medium',
    description: 'Generate the first 10 Fibonacci numbers.',
    code: {
      c: `#include <stdio.h>

int main() {
    int n = 10, a = 0, b = 1;
    printf("Fibonacci: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", a);
        int next = a + b;
        a = b;
        b = next;
    }
    printf("\\n");
    return 0;
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n = 10, a = 0, b = 1;
    cout << "Fibonacci: ";
    for (int i = 0; i < n; i++) {
        cout << a << " ";
        int next = a + b;
        a = b;
        b = next;
    }
    cout << endl;
    return 0;
}`,
      python: `n = 10
a, b = 0, 1
print("Fibonacci:", end=" ")
for i in range(n):
    print(a, end=" ")
    a, b = b, a + b
print()`,
      java: `public class Main {
    public static void main(String[] args) {
        int n = 10, a = 0, b = 1;
        System.out.print("Fibonacci: ");
        for (int i = 0; i < n; i++) {
            System.out.print(a + " ");
            int next = a + b;
            a = b;
            b = next;
        }
        System.out.println();
    }
}`,
      javascript: `const n = 10;
let a = 0, b = 1;
const result = [];
for (let i = 0; i < n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
}
console.log("Fibonacci: " + result.join(" "));`,
    },
  },
  {
    name: 'Palindrome Check',
    difficulty: 'Medium',
    description: 'Check if a string is a palindrome (reads same forwards and backwards).',
    code: {
      c: `#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>

bool isPalindrome(char str[]) {
    int left = 0, right = strlen(str) - 1;
    while (left < right) {
        if (tolower(str[left]) != tolower(str[right]))
            return false;
        left++;
        right--;
    }
    return true;
}

int main() {
    char words[][20] = {"radar", "hello", "level"};
    for (int i = 0; i < 3; i++) {
        printf("\\"%s\\" is %s\\n", words[i], isPalindrome(words[i]) ? "a palindrome" : "not a palindrome");
    }
    return 0;
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(string str) {
    int left = 0, right = str.length() - 1;
    while (left < right) {
        if (tolower(str[left]) != tolower(str[right])) return false;
        left++; right--;
    }
    return true;
}

int main() {
    string words[] = {"radar", "hello", "level"};
    for (string w : words)
        cout << "\\"" << w << "\\" is " << (isPalindrome(w) ? "" : "not ") << "a palindrome" << endl;
    return 0;
}`,
      python: `def is_palindrome(s):
    s = s.lower()
    return s == s[::-1]

words = ["radar", "hello", "level"]
for w in words:
    print(f'"{w}" is {"a palindrome" if is_palindrome(w) else "not a palindrome"}')`,
      java: `public class Main {
    static boolean isPalindrome(String str) {
        str = str.toLowerCase();
        int left = 0, right = str.length() - 1;
        while (left < right) {
            if (str.charAt(left) != str.charAt(right)) return false;
            left++; right--;
        }
        return true;
    }
    public static void main(String[] args) {
        String[] words = {"radar", "hello", "level"};
        for (String w : words)
            System.out.println("\\"" + w + "\\" is " + (isPalindrome(w) ? "a palindrome" : "not a palindrome"));
    }
}`,
      javascript: `function isPalindrome(str) {
    str = str.toLowerCase();
    let left = 0, right = str.length - 1;
    while (left < right) {
        if (str[left] !== str[right]) return false;
        left++; right--;
    }
    return true;
}

["radar", "hello", "level"].forEach(w => {
    console.log(w + " is " + (isPalindrome(w) ? "a palindrome" : "not a palindrome"));
});`,
    },
  },
]

// ─── Browser-based code execution (free, unlimited, no API) ───

/**
 * Run JavaScript code in the browser by capturing console.log output.
 */
function runJavaScriptInBrowser(code: string): string {
  const output: string[] = []
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  const captureLog = (...args: any[]) => {
    output.push(args.map(a => {
      if (typeof a === 'object') {
        try { return JSON.stringify(a) } catch { return String(a) }
      }
      return String(a)
    }).join(' '))
  }

  console.log = captureLog
  console.error = captureLog
  console.warn = captureLog

  try {
    // Create a function scope and execute
    const fn = new Function(code)
    fn()
    if (output.length === 0) {
      output.push('No output (code ran successfully)')
    }
  } catch (err) {
    output.push(`Error: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  }

  return output.join('\n')
}

/**
 * Run Python code in the browser using Pyodide (WebAssembly).
 * Pyodide is loaded from CDN — completely free and unlimited.
 */
let pyodidePromise: Promise<any> | null = null

async function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise

  pyodidePromise = new Promise((resolve, reject) => {
    // Load Pyodide script from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'
    script.onload = async () => {
      try {
        // @ts-ignore
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        })
        resolve(pyodide)
      } catch (err) {
        reject(err)
      }
    }
    script.onerror = () => reject(new Error('Failed to load Pyodide'))
    document.head.appendChild(script)
  })

  return pyodidePromise
}

async function runPythonInBrowser(code: string, stdin?: string): Promise<string> {
  try {
    const pyodide = await loadPyodide()

    // Capture stdout
    pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`)

    // If stdin is provided, set it
    if (stdin) {
      pyodide.runPython(`
import sys
sys.stdin = io.StringIO(${JSON.stringify(stdin)})
`)
    }

    // Run the user's code
    try {
      pyodide.runPython(code)
    } catch (err: any) {
      // Get stderr output
      const stderr = pyodide.runPython('sys.stderr.getvalue()')
      const stdout = pyodide.runPython('sys.stdout.getvalue()')
      let result = ''
      if (stdout) result += stdout
      if (stderr) result += `\nError:\n${stderr}`
      if (!result) result = `Error: ${err.message || String(err)}`
      return result
    }

    // Get captured output
    const stdout = pyodide.runPython('sys.stdout.getvalue()')
    const stderr = pyodide.runPython('sys.stderr.getvalue()')

    let result = ''
    if (stdout) result += stdout
    if (stderr) result += `\n${stderr}`
    if (!result) result = 'No output (code ran successfully)'

    return result
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to load Pyodide')) {
      return 'Loading Python runtime... Please try again in a few seconds.\n\nFirst run downloads Pyodide (~10MB). Subsequent runs are instant.'
    }
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ─── Component ───

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
  const [fullscreen, setFullscreen] = useState(false)
  const [showExamples, setShowExamples] = useState(true)
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const switchLanguage = (newLang: LangKey) => {
    setLang(newLang)
    setCode(STARTER_CODE[newLang])
    setOutput('')
  }

  const loadExample = (example: CodeExample) => {
    setCode(example.code[lang])
    setOutput('')
    setShowExamples(false)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('⏳ Running...')

    try {
      // Python and JavaScript run IN THE BROWSER — free, unlimited, no API
      if (lang === 'javascript') {
        const result = runJavaScriptInBrowser(code)
        setOutput(result)
        setRunning(false)
        return
      }

      if (lang === 'python') {
        const result = await runPythonInBrowser(code, stdin)
        setOutput(result)
        setRunning(false)
        return
      }

      // C, C++, Java → use server API (Wandbox — free, unlimited)
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang, stdin: stdin || undefined }),
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

  const resetCode = () => {
    setCode(STARTER_CODE[lang])
    setOutput('')
  }

  const toggleFullscreen = useCallback(() => {
    setFullscreen((f) => !f)
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div
      ref={containerRef}
      className={fullscreen ? 'fixed inset-0 z-[100] bg-[#0f172a] p-4 overflow-auto' : ''}
    >
      {/* Examples panel */}
      {showExamples && !fullscreen && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Code Examples</h3>
            <button
              onClick={() => setShowExamples(false)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                onClick={() => loadExample(ex)}
                className="text-left rounded-lg border border-border bg-muted/20 p-3 hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{ex.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        ex.difficulty === 'Easy' ? 'rgba(16,185,129,0.15)' :
                        ex.difficulty === 'Medium' ? 'rgba(245,158,11,0.15)' :
                        'rgba(239,68,68,0.15)',
                      color:
                        ex.difficulty === 'Easy' ? '#10b981' :
                        ex.difficulty === 'Medium' ? '#f59e0b' :
                        '#ef4444',
                    }}
                  >
                    {ex.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{ex.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main editor */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-green-500" />
            {/* Language tabs */}
            <div className="flex gap-1 flex-wrap">
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
              title="Show examples"
            >
              <BookOpen className="h-3 w-3" />
            </button>
            <button
              onClick={resetCode}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
              title="Reset code"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={() => setShowStdin(!showStdin)}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                showStdin
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
              title="Toggle input"
            >
              <Terminal className="h-3 w-3" />
            </button>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </button>
            <button
              onClick={runCode}
              disabled={running}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors ml-1"
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {running ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Stdin input */}
        {showStdin && (
          <div className="border-b border-border bg-zinc-900 p-3">
            <label className="text-[10px] font-semibold uppercase text-muted-foreground mb-1 block">Input (stdin)</label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={2}
              className="w-full bg-zinc-950 p-2 font-mono text-xs text-zinc-300 outline-none border border-zinc-800 rounded resize-y"
              placeholder="Enter input for your program..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Code editor */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={fullscreen ? 20 : 14}
          className="w-full bg-zinc-900 p-3 font-mono text-xs text-green-400 outline-none resize-y"
          spellCheck={false}
          placeholder={`Write your ${LANGUAGES.find((l) => l.key === lang)?.label} code here...`}
          style={{ tabSize: 4 }}
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

      {/* Supported languages info */}
      {!fullscreen && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">Supported Languages</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { name: 'C', desc: 'gcc 10.2' },
              { name: 'C++', desc: 'g++ 10.2' },
              { name: 'Python', desc: '3.10' },
              { name: 'Java', desc: 'OpenJDK 15' },
              { name: 'JavaScript', desc: 'Node 18' },
            ].map((l) => (
              <div key={l.name} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
                <p className="text-xs font-semibold">{l.name}</p>
                <p className="text-[10px] text-muted-foreground">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
