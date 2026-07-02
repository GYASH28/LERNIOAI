/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// Lernio AI 2.0 — Coding Lab Seed Script (standalone)
// ----------------------------------------------------------------------------
// Inserts REAL CodingChallenge rows for the OOP with C++ (CS202) subject.
// Idempotent: upserts by `title` (safe to run multiple times).
// Does NOT touch the academic seed (scripts/seed.ts is excluded from lint and
// we don't want to risk that pipeline).
//
// Run with:  bun run scripts/seed-coding.ts
// ============================================================================

import { db } from "../src/lib/db";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
type Difficulty = "easy" | "medium" | "hard";

interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

interface ChallengeSeed {
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  starterCode: string;
  solutionCode: string;
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitKB: number;
}

// ---------------------------------------------------------------------------
// CHALLENGES — 10 real C++ exercises across the OOP syllabus.
// Each solution is a working program; each test case's `expected` is the
// exact stdout the solution produces for the given stdin. They are correct
// today, so when a real sandboxed runner is wired up they will work as-is.
// ---------------------------------------------------------------------------

const CHALLENGES: ChallengeSeed[] = [
  // 1) basic_syntax — Hello World
  {
    title: "Hello, World!",
    category: "basic_syntax",
    difficulty: "easy",
    description:
      "Write the classic first C++ program: print \"Hello, World!\" to the console.\n\nThis introduces the #include directive, the iostream library, the std namespace, and the main function.\n\nExample:\n  Input:  (none)\n  Output: Hello, World!",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}",
    testCases: [
      { input: "", expected: "Hello, World!", hidden: false },
      { input: "", expected: "Hello, World!", hidden: false },
      { input: "", expected: "Hello, World!", hidden: true },
      { input: "", expected: "Hello, World!", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 2) basic_syntax — Simple Calculator
  {
    title: "Simple Calculator",
    category: "basic_syntax",
    difficulty: "easy",
    description:
      "Read two integers and an operator character (+, -, *, /) and print the integer result. Use integer division for '/'. Assume the second operand is never 0 for division.\n\nExample:\n  Input:  10 + 5\n  Output: 15",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    char op;\n    // Read a, op, b and print the result of a op b\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    char op;\n    cin >> a >> op >> b;\n    int result = 0;\n    if (op == '+') result = a + b;\n    else if (op == '-') result = a - b;\n    else if (op == '*') result = a * b;\n    else if (op == '/') result = a / b;\n    cout << result << endl;\n    return 0;\n}",
    testCases: [
      { input: "10 + 5", expected: "15", hidden: false },
      { input: "20 - 8", expected: "12", hidden: false },
      { input: "6 * 7", expected: "42", hidden: true },
      { input: "100 / 4", expected: "25", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 3) classes — Rectangle class
  {
    title: "Class Definition — Rectangle Area",
    category: "classes",
    difficulty: "easy",
    description:
      "Create a Rectangle class with private data members length and breadth. Add a public method setDimensions(int l, int b) and an area() method that returns length * breadth. In main(), read two integers, set them on a Rectangle, and print the area.\n\nExample:\n  Input:  5 4\n  Output: 20",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nclass Rectangle {\nprivate:\n    int length, breadth;\npublic:\n    // void setDimensions(int l, int b)\n    // int area()\n};\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nclass Rectangle {\nprivate:\n    int length, breadth;\npublic:\n    void setDimensions(int l, int b) {\n        length = l;\n        breadth = b;\n    }\n    int area() {\n        return length * breadth;\n    }\n};\n\nint main() {\n    int l, b;\n    cin >> l >> b;\n    Rectangle r;\n    r.setDimensions(l, b);\n    cout << r.area() << endl;\n    return 0;\n}",
    testCases: [
      { input: "5 4", expected: "20", hidden: false },
      { input: "3 7", expected: "21", hidden: false },
      { input: "1 1", expected: "1", hidden: true },
      { input: "10 10", expected: "100", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 4) constructors — Constructor Overloading (Box)
  {
    title: "Constructor Overloading — Box Volume",
    category: "constructors",
    difficulty: "medium",
    description:
      "Create a Box class with two constructors: a default constructor that sets side = 1, and a parameterised constructor Box(int s) that sets side = s. Add a volume() method returning side*side*side. In main(), read an integer n; if n is -1, construct a default Box; otherwise construct Box(n). Print the volume.\n\nExample:\n  Input:  3\n  Output: 27",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nclass Box {\n    int side;\npublic:\n    // Box()           -> side = 1\n    // Box(int s)      -> side = s\n    // int volume()    -> side*side*side\n};\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nclass Box {\n    int side;\npublic:\n    Box() { side = 1; }\n    Box(int s) { side = s; }\n    int volume() { return side * side * side; }\n};\n\nint main() {\n    int n;\n    cin >> n;\n    Box b;\n    if (n != -1) b = Box(n);\n    cout << b.volume() << endl;\n    return 0;\n}",
    testCases: [
      { input: "3", expected: "27", hidden: false },
      { input: "-1", expected: "1", hidden: false },
      { input: "5", expected: "125", hidden: true },
      { input: "2", expected: "8", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 5) inheritance — Single Inheritance (Animal/Dog)
  {
    title: "Single Inheritance — Animal and Dog",
    category: "inheritance",
    difficulty: "medium",
    description:
      "Create a base class Animal with a method sound() that prints \"Animal sound\". Derive a class Dog (public inheritance) that overrides sound() to print \"Bark\". In main(), read an integer n; if n is 1, create an Animal and call sound(); otherwise create a Dog and call sound().\n\nExample:\n  Input:  2\n  Output: Bark",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nclass Animal {\npublic:\n    // void sound()\n};\n\nclass Dog : public Animal {\npublic:\n    // void sound()\n};\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nclass Animal {\npublic:\n    void sound() { cout << \"Animal sound\" << endl; }\n};\n\nclass Dog : public Animal {\npublic:\n    void sound() { cout << \"Bark\" << endl; }\n};\n\nint main() {\n    int n;\n    cin >> n;\n    if (n == 1) {\n        Animal a;\n        a.sound();\n    } else {\n        Dog d;\n        d.sound();\n    }\n    return 0;\n}",
    testCases: [
      { input: "1", expected: "Animal sound", hidden: false },
      { input: "2", expected: "Bark", hidden: false },
      { input: "1", expected: "Animal sound", hidden: true },
      { input: "2", expected: "Bark", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 6) polymorphism — Virtual Function
  {
    title: "Virtual Function — Runtime Polymorphism",
    category: "polymorphism",
    difficulty: "hard",
    description:
      "Create a base class Shape with a virtual method draw() that prints \"Drawing shape\", and a virtual destructor. Derive Circle and Square, each overriding draw() to print \"Drawing circle\" and \"Drawing square\" respectively. In main(), read an integer n; if n is 1, create a Shape* pointing to a Circle; if n is 2, point to a Square. Call draw() through the pointer, then delete it.\n\nExample:\n  Input:  1\n  Output: Drawing circle",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nclass Shape {\npublic:\n    virtual void draw() { /* base */ }\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\npublic:\n    // void draw()\n};\n\nclass Square : public Shape {\npublic:\n    // void draw()\n};\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nclass Shape {\npublic:\n    virtual void draw() { cout << \"Drawing shape\" << endl; }\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\npublic:\n    void draw() override { cout << \"Drawing circle\" << endl; }\n};\n\nclass Square : public Shape {\npublic:\n    void draw() override { cout << \"Drawing square\" << endl; }\n};\n\nint main() {\n    int n;\n    cin >> n;\n    Shape* s = nullptr;\n    if (n == 1) s = new Circle();\n    else if (n == 2) s = new Square();\n    if (s) {\n        s->draw();\n        delete s;\n    }\n    return 0;\n}",
    testCases: [
      { input: "1", expected: "Drawing circle", hidden: false },
      { input: "2", expected: "Drawing square", hidden: false },
      { input: "1", expected: "Drawing circle", hidden: true },
      { input: "2", expected: "Drawing square", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 7) templates — Template Function myMax
  {
    title: "Template Function — Maximum of Two",
    category: "templates",
    difficulty: "medium",
    description:
      "Write a template function myMax(T a, T b) that returns the larger of the two values. In main(), read a type flag character: 'i' for int or 'd' for double. Then read two values of that type and print myMax of them. This demonstrates that one template works for multiple types.\n\nExample:\n  Input:  i 5 9\n  Output: 9",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\n// template <typename T>\n// T myMax(T a, T b)\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\ntemplate <typename T>\nT myMax(T a, T b) {\n    return (a > b) ? a : b;\n}\n\nint main() {\n    char t;\n    cin >> t;\n    if (t == 'i') {\n        int a, b;\n        cin >> a >> b;\n        cout << myMax(a, b) << endl;\n    } else {\n        double a, b;\n        cin >> a >> b;\n        cout << myMax(a, b) << endl;\n    }\n    return 0;\n}",
    testCases: [
      { input: "i 5 9", expected: "9", hidden: false },
      { input: "d 3.14 2.71", expected: "3.14", hidden: false },
      { input: "i 100 50", expected: "100", hidden: true },
      { input: "d 1.5 1.8", expected: "1.8", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 8) stl — Vector Sum
  {
    title: "STL Vector — Sum of Elements",
    category: "stl",
    difficulty: "medium",
    description:
      "Read an integer n followed by n integers into a std::vector, then print their sum. Use the STL vector container. The sum may exceed int range for large inputs, so use a wide accumulator type.\n\nExample:\n  Input:  3 1 2 3\n  Output: 6",
    starterCode:
      "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Read n, then n integers; print their sum\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> v(n);\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        cin >> v[i];\n        sum += v[i];\n    }\n    cout << sum << endl;\n    return 0;\n}",
    testCases: [
      { input: "3 1 2 3", expected: "6", hidden: false },
      { input: "5 10 20 30 40 50", expected: "150", hidden: false },
      { input: "1 42", expected: "42", hidden: true },
      { input: "4 -1 -2 -3 -4", expected: "-10", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 9) pointers — Swap using pointers
  {
    title: "Pointer Basics — Swap Two Values",
    category: "pointers",
    difficulty: "easy",
    description:
      "Read two integers a and b. Use two pointers pa and pb (pointing to a and b) to swap their values via dereference. Print the swapped values as \"a b\" on one line.\n\nExample:\n  Input:  3 5\n  Output: 5 3",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read a, b; swap them using pointers; print a b\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    int* pa = &a;\n    int* pb = &b;\n    int temp = *pa;\n    *pa = *pb;\n    *pb = temp;\n    cout << a << \" \" << b << endl;\n    return 0;\n}",
    testCases: [
      { input: "3 5", expected: "5 3", hidden: false },
      { input: "10 20", expected: "20 10", hidden: false },
      { input: "1 2", expected: "2 1", hidden: true },
      { input: "7 7", expected: "7 7", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },

  // 10) function_overloading — Add (int vs double)
  {
    title: "Function Overloading — Add",
    category: "function_overloading",
    difficulty: "easy",
    description:
      "Write two overloaded functions named add: one takes two ints and returns their int sum; another takes three doubles and returns their double sum. In main(), read a type flag character: 'i' for int (then read two ints) or 'd' for double (then read three doubles). Print add(...) for the matching overload. Double output is printed with one decimal place.\n\nExample:\n  Input:  i 3 4\n  Output: 7",
    starterCode:
      "#include <iostream>\n#include <iomanip>\nusing namespace std;\n\n// int add(int a, int b)\n// double add(double a, double b, double c)\n\nint main() {\n    // Your code here\n    return 0;\n}",
    solutionCode:
      "#include <iostream>\n#include <iomanip>\nusing namespace std;\n\nint add(int a, int b) { return a + b; }\ndouble add(double a, double b, double c) { return a + b + c; }\n\nint main() {\n    char t;\n    cin >> t;\n    if (t == 'i') {\n        int a, b;\n        cin >> a >> b;\n        cout << add(a, b) << endl;\n    } else {\n        double a, b, c;\n        cin >> a >> b >> c;\n        cout << fixed << setprecision(1) << add(a, b, c) << endl;\n    }\n    return 0;\n}",
    testCases: [
      { input: "i 3 4", expected: "7", hidden: false },
      { input: "d 1.5 2.5 1.0", expected: "5.0", hidden: false },
      { input: "i 100 200", expected: "300", hidden: true },
      { input: "d 2.0 3.0 5.0", expected: "10.0", hidden: true },
    ],
    timeLimitMs: 5000,
    memoryLimitKB: 256000,
  },
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding CodingChallenge rows…");
  let inserted = 0;
  let updated = 0;

  for (const ch of CHALLENGES) {
    const existing = await db.codingChallenge.findFirst({
      where: { title: ch.title },
      select: { id: true },
    });

    const data = {
      title: ch.title,
      category: ch.category,
      difficulty: ch.difficulty,
      description: ch.description,
      starterCode: ch.starterCode,
      solutionCode: ch.solutionCode,
      testCases: JSON.stringify(ch.testCases),
      timeLimitMs: ch.timeLimitMs,
      memoryLimitKB: ch.memoryLimitKB,
    };

    if (existing) {
      await db.codingChallenge.update({
        where: { id: existing.id },
        data,
      });
      updated++;
      console.log(`  [updated] ${ch.title}`);
    } else {
      await db.codingChallenge.create({ data });
      inserted++;
      console.log(`  [inserted] ${ch.title}`);
    }
  }

  const total = await db.codingChallenge.count();
  console.log(
    `\nDone. inserted=${inserted} updated=${updated} totalInDb=${total}`
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
