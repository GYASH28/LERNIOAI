/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// Lernio AI 2.0 — Seed Script
// Comprehensive CWIT Pune Semester 3 (Diploma in Computer Engineering)
// Idempotent: deletes all rows in dependency order, then recreates.
// Run with: bun run scripts/seed.ts
// ============================================================================

import { db } from "../src/lib/db";
import { hashSync } from "bcryptjs";
import { CWIT_DEPARTMENTS } from "../src/lib/cwit-departments";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
type Difficulty = "easy" | "medium" | "hard";

interface TopicSeed {
  slug: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  examWeightage: number;
}

interface UnitSeed {
  number: number;
  title: string;
  description?: string;
  weightage: number;
  topics: TopicSeed[];
}

interface SubjectSeed {
  code: string;
  name: string;
  shortName: string;
  credits: number;
  icon: string;
  accentColor: string;
  mascotKey: string;
  description: string;
  units: UnitSeed[];
}

// ---------------------------------------------------------------------------
// ACADEMIC HIERARCHY
// ---------------------------------------------------------------------------
const INSTITUTION = {
  name: "Cusrow Wadia Institute of Technology",
  code: "CWIT",
  city: "Pune",
};

const ACTIVE_DEPARTMENT_CODE = "COMP";
const ACTIVE_PROGRAMME_CODE = "DCOMP";
const SCHEME = { name: "G Scheme 2023", code: "G2023", startYear: 2023 };
const SEMESTER = {
  number: 3,
  name: "Semester 3",
  subtitle: "Core Engineering",
  color: "#7c3aed",
};

// ---------------------------------------------------------------------------
// SUBJECTS → UNITS → TOPICS
// ---------------------------------------------------------------------------
const SUBJECTS: SubjectSeed[] = [
  // ========================================================================
  // 1) DATA STRUCTURES (CS201)
  // ========================================================================
  {
    code: "CS201",
    name: "Data Structures",
    shortName: "DS",
    credits: 4,
    icon: "Binary",
    accentColor: "#06b6d4",
    mascotKey: "byte",
    description:
      "Foundational course on organising, storing and retrieving data efficiently. Covers arrays, sorting, stacks, queues, linked lists, trees and graphs with complexity analysis.",
    units: [
      {
        number: 1,
        title: "Introduction to Data Structures",
        description: "What is a data structure, why it matters, and how we measure efficiency.",
        weightage: 15,
        topics: [
          { slug: "data-structures-overview", title: "Data Structures Overview", difficulty: "easy", examWeightage: 8, description: "Definition, classification (linear vs non-linear, static vs dynamic), primitive vs non-primitive." },
          { slug: "asymptotic-notation", title: "Asymptotic Notation (Big-O)", difficulty: "medium", examWeightage: 7, description: "Big-O, Big-Ω and Big-Θ notations for expressing growth rates." },
          { slug: "time-space-complexity", title: "Time and Space Complexity", difficulty: "medium", examWeightage: 5, description: "Best, average and worst case analysis; trade-offs between time and memory." },
        ],
      },
      {
        number: 2,
        title: "Arrays and Searching",
        description: "Contiguous storage and the two core search strategies.",
        weightage: 15,
        topics: [
          { slug: "arrays-basics", title: "Arrays Basics", difficulty: "easy", examWeightage: 6, description: "Declaration, memory layout, traversal, insertion, deletion and their costs." },
          { slug: "linear-search", title: "Linear Search", difficulty: "easy", examWeightage: 4, description: "Sequential scan, O(n) complexity, when to use it." },
          { slug: "binary-search", title: "Binary Search", difficulty: "medium", examWeightage: 8, description: "Divide-and-conquer search on sorted arrays, O(log n) complexity." },
          { slug: "two-dimensional-arrays", title: "Two-Dimensional Arrays", difficulty: "medium", examWeightage: 4, description: "Row-major / column-major storage, matrix operations." },
        ],
      },
      {
        number: 3,
        title: "Sorting Algorithms",
        description: "Classic comparison sorts with their complexity trade-offs.",
        weightage: 20,
        topics: [
          { slug: "bubble-sort", title: "Bubble Sort", difficulty: "easy", examWeightage: 6, description: "Adjacent-swap sort, O(n²) average; optimised early-exit variant." },
          { slug: "selection-sort", title: "Selection Sort", difficulty: "easy", examWeightage: 5, description: "Repeated minimum selection, O(n²) always, minimal swaps." },
          { slug: "insertion-sort", title: "Insertion Sort", difficulty: "medium", examWeightage: 5, description: "Build a sorted prefix; efficient on nearly-sorted data." },
          { slug: "merge-and-quick-sort", title: "Merge Sort and Quick Sort", difficulty: "hard", examWeightage: 8, description: "Divide-and-conquer sorts, O(n log n) average; partition strategies and stability." },
        ],
      },
      {
        number: 4,
        title: "Stack and Queue",
        description: "Restricted-access linear structures that power compilers and OS queues.",
        weightage: 20,
        topics: [
          { slug: "stack-basics", title: "Stack Basics (LIFO)", difficulty: "easy", examWeightage: 8, description: "Push, pop, peek; array and linked-list implementations; applications." },
          { slug: "stack-applications", title: "Stack Applications", difficulty: "medium", examWeightage: 6, description: "Infix to postfix conversion, expression evaluation, recursion, balanced parentheses." },
          { slug: "queue-basics", title: "Queue Basics (FIFO)", difficulty: "easy", examWeightage: 6, description: "Enqueue, dequeue; linear, circular and priority queues." },
        ],
      },
      {
        number: 5,
        title: "Linked Lists",
        description: "Dynamic node-based linear structures.",
        weightage: 15,
        topics: [
          { slug: "singly-linked-list", title: "Singly Linked List", difficulty: "medium", examWeightage: 7, description: "Node structure, traversal, insertion and deletion at head/tail/middle." },
          { slug: "doubly-linked-list", title: "Doubly and Circular Linked Lists", difficulty: "medium", examWeightage: 5, description: "Bidirectional traversal, circular linkage, trade-offs vs singly linked." },
          { slug: "linked-list-applications", title: "Linked List Applications", difficulty: "medium", examWeightage: 3, description: "Polynomial representation, dynamic memory, adjacency lists." },
        ],
      },
      {
        number: 6,
        title: "Trees and Graphs",
        description: "Non-linear structures for hierarchical and networked data.",
        weightage: 15,
        topics: [
          { slug: "binary-trees", title: "Binary Trees", difficulty: "medium", examWeightage: 6, description: "Terminology, types (full, complete, perfect), traversals." },
          { slug: "bst-basics", title: "Binary Search Trees", difficulty: "medium", examWeightage: 5, description: "Ordered insertion, search, deletion; average O(log n) operations." },
          { slug: "graph-basics", title: "Graph Basics", difficulty: "hard", examWeightage: 4, description: "Vertices, edges, directed/undirected, representations, BFS/DFS overview." },
        ],
      },
    ],
  },

  // ========================================================================
  // 2) OOP WITH C++ (CS202)
  // ========================================================================
  {
    code: "CS202",
    name: "Object Oriented Programming with C++",
    shortName: "OOP",
    credits: 4,
    icon: "Code2",
    accentColor: "#f59e0b",
    mascotKey: "coda",
    description:
      "Covers the four pillars of OOP — encapsulation, inheritance, polymorphism and abstraction — using C++. Includes classes, constructors, operator overloading, templates, exception handling and file I/O.",
    units: [
      {
        number: 1,
        title: "OOP Concepts & C++ Basics",
        description: "Why OOP, comparison with procedural C, and C++ I/O fundamentals.",
        weightage: 15,
        topics: [
          { slug: "oop-paradigm", title: "OOP Paradigm & Pillars", difficulty: "easy", examWeightage: 8, description: "Procedural vs object-oriented; encapsulation, inheritance, polymorphism, abstraction." },
          { slug: "cpp-vs-c", title: "C++ vs C and I/O Streams", difficulty: "easy", examWeightage: 4, description: "cin/cout, namespaces, function overloading, inline and default arguments." },
          { slug: "references-and-dynamic-memory", title: "References and Dynamic Memory", difficulty: "medium", examWeightage: 5, description: "Reference variables, new/delete operators, memory leaks." },
        ],
      },
      {
        number: 2,
        title: "Classes and Objects",
        description: "The blueprint pattern: data and behaviour bundled into objects.",
        weightage: 20,
        topics: [
          { slug: "classes-objects-basics", title: "Classes and Objects Basics", difficulty: "easy", examWeightage: 8, description: "Class declaration, access specifiers, member functions, object instantiation." },
          { slug: "static-members", title: "Static Members and Friend Functions", difficulty: "medium", examWeightage: 6, description: "static data/function members, friend function and friend class." },
          { slug: "this-pointer", title: "this Pointer and Inline Functions", difficulty: "medium", examWeightage: 6, description: "Self-reference pointer, returning *this, inline member functions." },
        ],
      },
      {
        number: 3,
        title: "Constructors, Destructors & Operator Overloading",
        description: "Object lifecycle and giving operators new meaning for user types.",
        weightage: 20,
        topics: [
          { slug: "constructors", title: "Constructors (Default, Parameterised, Copy)", difficulty: "medium", examWeightage: 8, description: "Automatic initialisation, default arguments, copy constructor, shallow vs deep copy." },
          { slug: "destructors", title: "Destructors", difficulty: "easy", examWeightage: 4, description: "Cleanup at object end-of-life, virtual destructors in inheritance." },
          { slug: "operator-overloading", title: "Operator Overloading", difficulty: "hard", examWeightage: 8, description: "Member vs friend overloading, binary/unary operators, restrictions, type conversion." },
        ],
      },
      {
        number: 4,
        title: "Inheritance and Polymorphism",
        description: "Reusing code through derivation and runtime flexibility through virtuals.",
        weightage: 25,
        topics: [
          { slug: "inheritance-basics", title: "Inheritance Basics", difficulty: "medium", examWeightage: 8, description: "Single, multilevel, multiple, hierarchical, hybrid; access modes (public/private/protected)." },
          { slug: "virtual-functions", title: "Virtual Functions & Runtime Polymorphism", difficulty: "hard", examWeightage: 9, description: "Late binding, virtual keyword, vtable, abstract classes and pure virtual functions." },
          { slug: "runtime-errors", title: "Ambiguity, Virtual Base & RTTI", difficulty: "hard", examWeightage: 5, description: "Diamond problem, virtual base class, dynamic_cast and typeid." },
        ],
      },
      {
        number: 5,
        title: "Templates, Exceptions & File Handling",
        description: "Generic programming, robust error handling and persistent storage.",
        weightage: 20,
        topics: [
          { slug: "templates", title: "Function and Class Templates", difficulty: "medium", examWeightage: 7, description: "Generic functions and classes, template specialisation, STL preview." },
          { slug: "exception-handling", title: "Exception Handling", difficulty: "medium", examWeightage: 6, description: "try/throw/catch, multiple catch, rethrowing, standard exceptions." },
          { slug: "file-handling", title: "File Handling", difficulty: "medium", examWeightage: 7, description: "fstream, ifstream, ofstream; text vs binary; sequential and random access." },
        ],
      },
    ],
  },

  // ========================================================================
  // 3) MICROPROCESSORS AND PROGRAMMING (CS203)
  // ========================================================================
  {
    code: "CS203",
    name: "Microprocessors and Programming",
    shortName: "MP",
    credits: 3,
    icon: "Cpu",
    accentColor: "#ec4899",
    mascotKey: "pico",
    description:
      "Architecture and programming of the Intel 8086 microprocessor. Covers register set, addressing modes, instruction set, assembly programming, memory/IO interfacing and interrupts.",
    units: [
      {
        number: 1,
        title: "8086 Architecture",
        description: "Internal organisation, register file and bus interface of the 8086.",
        weightage: 20,
        topics: [
          { slug: "8086-architecture-overview", title: "8086 Architecture Overview", difficulty: "easy", examWeightage: 7, description: "BIU, EU, pipelining, 20-bit address bus, memory segmentation." },
          { slug: "8086-registers", title: "8086 Registers", difficulty: "medium", examWeightage: 8, description: "AX–DX (and 8-bit halves), SI, DI, BP, SP, IP, segment registers, FLAGS." },
          { slug: "memory-segmentation", title: "Memory Segmentation", difficulty: "medium", examWeightage: 5, description: "Physical address = segment × 16 + offset; segment:offset notation." },
        ],
      },
      {
        number: 2,
        title: "8086 Instruction Set & Addressing Modes",
        description: "How operands are located and the major instruction families.",
        weightage: 25,
        topics: [
          { slug: "addressing-modes", title: "Addressing Modes", difficulty: "medium", examWeightage: 9, description: "Register, immediate, direct, register indirect, based, indexed, based-indexed." },
          { slug: "data-transfer-instructions", title: "Data Transfer Instructions", difficulty: "easy", examWeightage: 5, description: "MOV, XCHG, LEA, PUSH, POP, IN, OUT, XLAT." },
          { slug: "arithmetic-logical-instructions", title: "Arithmetic & Logical Instructions", difficulty: "medium", examWeightage: 7, description: "ADD/SUB/MUL/DIV, INC/DEC, AND/OR/XOR/NOT, CMP, shift/rotate." },
          { slug: "branching-loop-instructions", title: "Branching & Loop Instructions", difficulty: "medium", examWeightage: 5, description: "JMP, conditional jumps, LOOP, LOOPE/LOOPNE, procedure CALL/RET." },
        ],
      },
      {
        number: 3,
        title: "Assembly Language Programming",
        description: "Writing and assembling real 8086 programs.",
        weightage: 25,
        topics: [
          { slug: "assembly-program-structure", title: "Assembly Program Structure", difficulty: "medium", examWeightage: 7, description: ".model, .stack, .data, .code; DB/DW directives; assembler structure." },
          { slug: "simple-programs", title: "Simple Assembly Programs", difficulty: "medium", examWeightage: 9, description: "Add two numbers, find largest, sum of array, factorial using loop." },
          { slug: "string-procedures", title: "String and Procedure Programs", difficulty: "hard", examWeightage: 9, description: "String instructions (MOVSB/CMPSB), procedures, macros, recursion." },
        ],
      },
      {
        number: 4,
        title: "Memory & I/O Interfaces",
        description: "How the 8086 talks to RAM, ROM and peripherals.",
        weightage: 15,
        topics: [
          { slug: "memory-interfacing", title: "Memory Interfacing", difficulty: "medium", examWeightage: 7, description: "RAM/ROM chips, address decoding, even/odd banks." },
          { slug: "io-interfacing", title: "I/O Interfacing Techniques", difficulty: "medium", examWeightage: 8, description: "Memory-mapped vs I/O-mapped, programmable peripherals (8255, 8259, 8253/8254)." },
        ],
      },
      {
        number: 5,
        title: "Interrupts and Basic Peripherals",
        description: "Servicing external events and simple I/O devices.",
        weightage: 15,
        topics: [
          { slug: "interrupts", title: "8086 Interrupts", difficulty: "hard", examWeightage: 9, description: "Hardware/software interrupts, IVT, ISR, NMI vs INTR, interrupt cycle." },
          { slug: "peripheral-devices", title: "Peripheral Devices (8259, 8255)", difficulty: "medium", examWeightage: 6, description: "PIC 8259 modes, PPI 8255 modes, handshake I/O." },
        ],
      },
    ],
  },

  // ========================================================================
  // 4) DATA COMMUNICATION (CS204)
  // ========================================================================
  {
    code: "CS204",
    name: "Data Communication",
    shortName: "DC",
    credits: 3,
    icon: "Network",
    accentColor: "#10b981",
    mascotKey: "nova",
    description:
      "Principles of transmitting data between devices. Covers signals, transmission media, modulation, encoding, multiplexing, switching and the OSI/TCP-IP layered models.",
    units: [
      {
        number: 1,
        title: "Introduction to Data Communication",
        description: "Components, characteristics and topologies of communication systems.",
        weightage: 15,
        topics: [
          { slug: "dc-components", title: "Components of Data Communication", difficulty: "easy", examWeightage: 7, description: "Sender, medium, receiver, message; direction modes (simplex, half-duplex, full-duplex)." },
          { slug: "network-topologies", title: "Network Topologies", difficulty: "easy", examWeightage: 4, description: "Bus, star, ring, mesh, tree, hybrid; pros and cons." },
          { slug: "transmission-modes", title: "Transmission Modes & Performance", difficulty: "medium", examWeightage: 4, description: "Serial vs parallel, synchronous vs asynchronous; throughput, latency, jitter." },
        ],
      },
      {
        number: 2,
        title: "Transmission Media and Signals",
        description: "Physical paths and the analogue/digital signals they carry.",
        weightage: 20,
        topics: [
          { slug: "transmission-media", title: "Transmission Media", difficulty: "easy", examWeightage: 8, description: "Guided (twisted pair, coax, fibre) vs unguided (radio, microwave, satellite)." },
          { slug: "analog-digital-signals", title: "Analog and Digital Signals", difficulty: "medium", examWeightage: 7, description: "Periodic/non-periodic, frequency, amplitude, phase, bandwidth, bit rate." },
          { slug: "transmission-impairment", title: "Transmission Impairment", difficulty: "medium", examWeightage: 5, description: "Attenuation, distortion, noise; Shannon and Nyquist capacity theorems." },
        ],
      },
      {
        number: 3,
        title: "Modulation and Encoding",
        description: "Placing data onto carrier signals — analogue and digital.",
        weightage: 20,
        topics: [
          { slug: "analog-modulation", title: "Analog Modulation (AM/FM/PM)", difficulty: "medium", examWeightage: 8, description: "Need for modulation, AM/FM/PM spectra and bandwidth, comparison." },
          { slug: "digital-modulation", title: "Digital Modulation (ASK/FSK/PSK)", difficulty: "medium", examWeightage: 6, description: "Amplitude/Frequency/Phase Shift Keying, QAM basics." },
          { slug: "line-coding", title: "Line Coding & Block Coding", difficulty: "medium", examWeightage: 6, description: "NRZ, Manchester, AMI, 4B/5B; clock recovery and DC balance." },
        ],
      },
      {
        number: 4,
        title: "Multiplexing & Switching",
        description: "Sharing media and routing data through networks.",
        weightage: 20,
        topics: [
          { slug: "multiplexing", title: "Multiplexing (FDM/TDM/WDM)", difficulty: "medium", examWeightage: 9, description: "Frequency, time (synchronous and statistical), wavelength division; guard bands." },
          { slug: "switching", title: "Switching Techniques", difficulty: "medium", examWeightage: 7, description: "Circuit, message, packet switching; virtual circuit vs datagram; comparison." },
          { slug: "network-devices", title: "Network Devices", difficulty: "easy", examWeightage: 4, description: "Hub, switch, router, bridge, gateway — where they operate." },
        ],
      },
      {
        number: 5,
        title: "OSI and TCP/IP Models",
        description: "The two reference architectures that organise all networking.",
        weightage: 25,
        topics: [
          { slug: "osi-model", title: "OSI Model", difficulty: "medium", examWeightage: 11, description: "Seven layers, functions, PDU at each layer, encapsulation." },
          { slug: "tcp-ip-model", title: "TCP/IP Model", difficulty: "medium", examWeightage: 9, description: "Four layers, mapping to OSI, key protocols (IP, TCP, UDP, HTTP)." },
          { slug: "osi-tcpip-comparison", title: "OSI vs TCP/IP Comparison", difficulty: "easy", examWeightage: 5, description: "Similarities, differences, real-world adoption." },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// LESSON CONTENT (rich JSON for 10 key topics across all 4 subjects)
// Each entry is keyed by subjectCode + topicSlug so we can attach after inserts.
// ---------------------------------------------------------------------------
interface LearnContent {
  definition: string;
  purpose: string;
  prerequisites: string[];
  coreConcepts: { title: string; explanation: string }[];
  stepByStep: string[];
  examples: { title: string; content: string }[];
  commonErrors: string[];
  examPoints: string[];
  summary: string;
}
interface SimplifyContent {
  simpleEnglish: string;
  hinglish: string;
  analogy: string;
  fiveMinute: string;
  oneMinuteRecap: string;
  examFormat: string;
}
interface VisualiseContent {
  type: "animation" | "diagram" | "interactive";
  description: string;
  steps: string[];
  reducedMotionAlt: string;
}
interface PractiseContent {
  guidedExamples: { question: string; solution: string }[];
  easyQuestions: string[];
  mediumQuestions: string[];
  hardQuestions: string[];
  hints: string[];
}
interface ReviseContent {
  shortNotes: string[];
  definitions: { term: string; definition: string }[];
  formulas: { name: string; formula: string; use: string }[];
  flashcards: { front: string; back: string }[];
  commonConfusions: { a: string; b: string; difference: string }[];
}

interface LessonSeed {
  subjectCode: string;
  topicSlug: string;
  title: string;
  order: number;
  durationMin: number;
  learn: LearnContent;
  simplify: SimplifyContent;
  visualise: VisualiseContent;
  practise: PractiseContent;
  revise: ReviseContent;
}

const LESSONS: LessonSeed[] = [
  // ==========================================================================
  // DS — data-structures-overview
  // ==========================================================================
  {
    subjectCode: "CS201",
    topicSlug: "data-structures-overview",
    title: "Data Structures Overview",
    order: 1,
    durationMin: 12,
    learn: {
      definition:
        "A data structure is a systematic way of organising, storing and managing data in a computer so that it can be accessed and modified efficiently. It defines the relationship between data elements and the set of operations that can be performed on them.",
      purpose:
        "Choosing the right data structure makes programs faster, use less memory and easier to maintain. Searching a phone book is O(n) with a list but O(log n) with a sorted array — the structure dictates the speed.",
      prerequisites: ["Basic C/C++ syntax", "Arrays and loops", "Concept of memory addresses"],
      coreConcepts: [
        { title: "Primitive vs Non-Primitive", explanation: "Primitive types (int, char, float, bool) hold a single value and are built into the language. Non-primitive types (arrays, lists, trees, files) are derived from primitives and are programmer-defined." },
        { title: "Linear vs Non-Linear", explanation: "Linear structures arrange data sequentially — each element has a unique predecessor and successor (array, stack, queue, linked list). Non-linear structures arrange data hierarchically or as a network (tree, graph)." },
        { title: "Static vs Dynamic", explanation: "Static structures (arrays) have a fixed size decided at compile time. Dynamic structures (linked lists, trees) grow and shrink at runtime, allocating memory on demand." },
        { title: "Operations on a DS", explanation: "Common operations include Traversal, Insertion, Deletion, Searching, Sorting, Merging and Updating. The cost of each operation depends on the chosen structure." },
      ],
      stepByStep: [
        "Identify the kind of data and relationships you must model (sequential, hierarchical, networked).",
        "List the operations you will perform most often (search, insert, delete, sort).",
        "Pick a candidate structure (array, list, stack, tree, hash).",
        "Estimate the time complexity of each frequent operation for that structure.",
        "If the worst-case cost is too high, switch structures or combine two.",
      ],
      examples: [
        { title: "Student marks as an array", content: "int marks[5] = {78, 86, 91, 67, 73}; — fixed size, O(1) random access, O(n) insertion in the middle." },
        { title: "Browser history as a stack", content: "Each visited URL is pushed; Back button pops — last page visited is the first returned. This LIFO behaviour is exactly what a stack gives." },
        { title: "Printer queue", content: "Print jobs are processed in arrival order — FIFO, modelled by a queue." },
      ],
      commonErrors: [
        "Confusing the data structure (the container) with the algorithm (the operations).",
        "Using an array when frequent middle insertions are needed — use a linked list instead.",
        "Forgetting that static arrays cannot grow — leads to buffer overflows.",
      ],
      examPoints: [
        "Definition of a data structure with one example each of linear and non-linear.",
        "Classification tree: primitive/non-primitive → linear/non-linear → static/dynamic.",
        "Names of operations: traverse, insert, delete, search, sort, merge.",
        "Difference between array and linked list in one line.",
      ],
      summary:
        "A data structure organises data for efficient access and modification. They are classified as primitive/non-primitive, linear/non-linear and static/dynamic. The right choice depends on which operations dominate your program.",
    },
    simplify: {
      simpleEnglish:
        "A data structure is just a way of arranging data so the computer can find it and change it quickly. Think of how a library shelf, a stack of plates and a queue at a ticket counter all hold items differently — each arrangement makes a particular job easier.",
      hinglish:
        "Data structure ek tareeka hai data ko arrange karne ka, taaki hum use jaldi se access ya modify kar sakein. Jaise library ki shelf mein books sorted hoti hain, plate stack mein last plate pehle nikalti hai — har arrangement kisi na kisi kaam ko easy banata hai.",
      analogy:
        "Your school bag is a data structure. If books are flat and ordered, you find any book in seconds (array). If you just toss them in, you must rummage (unsorted list). The arrangement decides the speed.",
      fiveMinute:
        "Spend one minute on the definition, two on the classification chart (primitive/non-primitive, linear/non-linear, static/dynamic), one on the operations list, and one on the array-vs-linked-list example. That covers 90% of Unit 1.",
      oneMinuteRecap:
        "Data structure = organised data + allowed operations. Two big classifications: linear vs non-linear, and static vs dynamic. Operations: traverse, insert, delete, search, sort.",
      examFormat:
        "Expect a 3-mark definition + classification question, and a 4-mark difference (array vs linked list, stack vs queue). Draw the classification tree for full marks.",
    },
    visualise: {
      type: "diagram",
      description:
        "A classification tree branches from 'Data Structures' into Primitive (int, char, float, bool) and Non-Primitive. Non-Primitive further splits into Linear (array, stack, queue, linked list) and Non-Linear (tree, graph). Linear splits into Static (array) and Dynamic (linked list, stack, queue).",
      steps: [
        "Start node: 'Data Structures' at the top centre.",
        "Two branches down: 'Primitive' (left) and 'Non-Primitive' (right).",
        "Under Primitive list: int, char, float, bool.",
        "Under Non-Primitive add two children: 'Linear' and 'Non-Linear'.",
        "Under Linear add: Array, Stack, Queue, Linked List.",
        "Under Non-Linear add: Tree, Graph.",
        "Draw a dotted edge from Linear to a 'Static / Dynamic' tag.",
      ],
      reducedMotionAlt:
        "Show the classification as a static indented list with bullet points instead of an animated tree.",
    },
    practise: {
      guidedExamples: [
        { question: "Classify a 'stack of plates in a cafeteria'.", solution: "It is non-primitive, linear (sequential order), and dynamic (size changes). The behaviour is LIFO." },
        { question: "Classify 'int marks[30]'.", solution: "Non-primitive, linear, static (size fixed at 30). Random access supported." },
      ],
      easyQuestions: [
        "Is a tree a linear or non-linear data structure?",
        "Name two primitive data types.",
        "Give one example of a static data structure.",
      ],
      mediumQuestions: [
        "Why is a linked list called dynamic while an array is called static?",
        "List any four operations common to all data structures.",
        "Classify queue along all three dimensions.",
      ],
      hardQuestions: [
        "A program needs fast search AND frequent middle-insertions. Propose a structure and justify.",
        "When does the choice of data structure affect algorithmic complexity? Give one numerical example.",
      ],
      hints: [
        "Linear = one-after-another. Non-linear = hierarchical.",
        "Static size is fixed at compile time.",
        "Operations you should remember: traverse, insert, delete, search, sort.",
      ],
    },
    revise: {
      shortNotes: [
        "DS = organised data + operations.",
        "Classification: primitive / non-primitive → linear / non-linear → static / dynamic.",
        "Linear examples: array, stack, queue, linked list.",
        "Non-linear examples: tree, graph.",
        "Operations: traverse, insert, delete, search, sort, merge, update.",
      ],
      definitions: [
        { term: "Data Structure", definition: "A systematic way of organising and storing data for efficient access and modification." },
        { term: "Primitive Type", definition: "A built-in single-value type such as int, char, float or bool." },
        { term: "Linear DS", definition: "A structure where elements are arranged sequentially with one predecessor and one successor." },
      ],
      formulas: [],
      flashcards: [
        { front: "Array is static or dynamic?", back: "Static — fixed size at compile time." },
        { front: "Tree is linear or non-linear?", back: "Non-linear." },
        { front: "Name 4 operations on a DS", back: "Traverse, insert, delete, search." },
      ],
      commonConfusions: [
        { a: "Data Structure", b: "Data Type", difference: "A data type tells what values are possible; a data structure tells how a collection of those values is organised." },
        { a: "Static", b: "Dynamic", difference: "Static size is decided at compile time; dynamic size can change at runtime." },
      ],
    },
  },

  // ==========================================================================
  // DS — asymptotic-notation
  // ==========================================================================
  {
    subjectCode: "CS201",
    topicSlug: "asymptotic-notation",
    title: "Asymptotic Notation (Big-O)",
    order: 2,
    durationMin: 14,
    learn: {
      definition:
        "Asymptotic notation is a mathematical tool to describe the running time or space requirement of an algorithm as the input size n grows toward infinity. Big-O gives an upper bound, Big-Ω a lower bound, and Big-Θ a tight bound.",
      purpose:
        "It lets us compare algorithms without depending on hardware, language or compiler. We can say merge sort is O(n log n) and bubble sort is O(n²) and know merge sort will win for large n on any machine.",
      prerequisites: ["Basic algebra", "Logarithms", "Loops and nested loops in C/C++"],
      coreConcepts: [
        { title: "Big-O (Upper Bound)", explanation: "f(n) = O(g(n)) means f grows no faster than g, up to a constant. It is the worst-case growth rate — what you quote in exams." },
        { title: "Big-Ω (Lower Bound)", explanation: "f(n) = Ω(g(n)) means f grows at least as fast as g. Best-case or theoretical minimum." },
        { title: "Big-Θ (Tight Bound)", explanation: "f(n) = Θ(g(n)) when f is both O(g) and Ω(g) — same growth rate, just constant differences." },
        { title: "Common Growth Rates", explanation: "From fastest to slowest: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!). Memorise this ladder." },
      ],
      stepByStep: [
        "Count the number of primitive operations as a function of n.",
        "Keep only the dominant term (highest power of n).",
        "Drop constant multipliers and lower-order terms.",
        "Express the result as O(...), Ω(...) or Θ(...) depending on what is asked.",
      ],
      examples: [
        { title: "Single loop", content: "for (i=0;i<n;i++) sum++; runs n times → O(n)." },
        { title: "Nested loop", content: "Two nested loops over n each give n×n = n² iterations → O(n²)." },
        { title: "Binary search", content: "Each step halves the search space → log₂n steps → O(log n)." },
        { title: "Log-linear example", content: "Merge sort recurses log n levels, each doing n work → O(n log n)." },
      ],
      commonErrors: [
        "Adding instead of multiplying nested loop counts — outer × inner, not outer + inner.",
        "Forgetting to drop constants: O(3n² + 5n) is simply O(n²).",
        "Calling best case the same as Big-O — Big-O is worst case.",
      ],
      examPoints: [
        "Definitions of O, Ω, Θ with one example each.",
        "Growth-rate ladder in order.",
        "Compute Big-O for a given code snippet (1 loop, nested loops, half-loop).",
        "Why constants are dropped — machine independence.",
      ],
      summary:
        "Asymptotic notation captures how an algorithm scales. Big-O is the upper bound, Ω the lower bound, Θ the tight bound. Always drop constants and keep the dominant term. The growth-rate ladder from O(1) to O(n!) is the exam favourite.",
    },
    simplify: {
      simpleEnglish:
        "Big-O tells you how the running time grows when the input gets bigger. O(1) means it never changes; O(n) means it grows proportionally; O(n²) means it grows quadratically — so doubling input quadruples time.",
      hinglish:
        "Big-O batata hai ki input bada hone par time kitna badhega. O(1) — constant, O(n) — input ke saath proportionate, O(n²) — double input → 4× time. Constants hamesha drop karte hain.",
      analogy:
        "Imagine reading a book. O(1) = reading the title. O(n) = reading every page once. O(n²) = for every page, reading every other page again. Bigger O = much slower as the book grows.",
      fiveMinute:
        "Minute 1: definition of Big-O. Minute 2-3: the growth ladder with one example each. Minute 4: simplify a polynomial example (3n²+5n → O(n²)). Minute 5: difference between O, Ω, Θ.",
      oneMinuteRecap:
        "Big-O = worst-case growth. Drop constants and lower-order terms. Ladder: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).",
      examFormat:
        "Likely a 3-mark derivation of Big-O from a code snippet and a 2-mark question on ordering growth rates. Always show the dominant term explicitly.",
    },
    visualise: {
      type: "animation",
      description:
        "An animated line chart plots operations vs input size for O(1), O(log n), O(n), O(n log n), O(n²) on the same axes. As n grows from 1 to 100, the curves diverge — O(n²) shoots off the top.",
      steps: [
        "Draw axes: x = input size n, y = number of operations.",
        "Animate n growing from 1 to 100 along the x-axis.",
        "Plot a flat line for O(1) — never rises.",
        "Plot a gentle curve for O(log n) — barely rises.",
        "Plot a straight diagonal for O(n).",
        "Plot a slightly curved O(n log n) just above O(n).",
        "Plot O(n²) shooting steeply upward — it dominates by n=20.",
      ],
      reducedMotionAlt:
        "Show a static table comparing operations for n = 10, 100, 1000 for each growth class.",
    },
    practise: {
      guidedExamples: [
        { question: "Find Big-O of: for(i=0;i<n;i++) for(j=0;j<n;j++) sum++;", solution: "Outer loop n iterations × inner n iterations = n². Drop constant → O(n²)." },
        { question: "Find Big-O of binary search on n elements.", solution: "Each comparison halves the range → log₂n comparisons → O(log n)." },
      ],
      easyQuestions: [
        "What does Big-O measure — time in seconds or growth rate?",
        "Which grows slower: O(n) or O(log n)?",
        "Simplify O(5n + 7).",
      ],
      mediumQuestions: [
        "Simplify O(3n² + 100n + 9).",
        "Arrange in increasing order: O(n²), O(1), O(log n), O(n log n), O(n).",
        "What is the Big-O of merge sort?",
      ],
      hardQuestions: [
        "Derive the recurrence for binary search and solve to get O(log n).",
        "An algorithm runs 2n² + n log n operations. Give its Big-O and justify dropping the lower term.",
      ],
      hints: [
        "Nested loops multiply, sequential loops add.",
        "Keep the largest power of n.",
        "log n comes from halving (binary search, balanced trees).",
      ],
    },
    revise: {
      shortNotes: [
        "Big-O = upper bound (worst case).",
        "Big-Ω = lower bound (best case).",
        "Big-Θ = tight bound.",
        "Growth ladder: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!).",
        "Drop constants and lower-order terms.",
      ],
      definitions: [
        { term: "Big-O", definition: "f(n) = O(g(n)) if f grows no faster than c·g(n) for some constant c and all n ≥ n₀." },
        { term: "Asymptotic", definition: "Behaviour as input size n tends to infinity." },
      ],
      formulas: [
        { name: "Binary search", formula: "T(n) = T(n/2) + 1", use: "Recurrence solved to O(log n)." },
        { name: "Merge sort", formula: "T(n) = 2·T(n/2) + n", use: "Recurrence solved to O(n log n)." },
      ],
      flashcards: [
        { front: "Drop constants in O(7n + 3)?", back: "O(n)." },
        { front: "Best case notation?", back: "Big-Ω." },
        { front: "Order: O(n) vs O(log n)?", back: "O(log n) is smaller / faster." },
      ],
      commonConfusions: [
        { a: "Big-O", b: "Big-Θ", difference: "Big-O is an upper bound only; Big-Θ requires matching upper and lower bounds — a tighter statement." },
        { a: "Best case", b: "Big-Ω", difference: "Best case is an input scenario; Big-Ω is a mathematical lower bound on growth. They are related but not identical." },
      ],
    },
  },

  // ==========================================================================
  // DS — bubble-sort
  // ==========================================================================
  {
    subjectCode: "CS201",
    topicSlug: "bubble-sort",
    title: "Bubble Sort",
    order: 7,
    durationMin: 12,
    learn: {
      definition:
        "Bubble sort is a comparison-based sorting algorithm that repeatedly steps through the list, compares adjacent pairs and swaps them if they are in the wrong order. After each pass, the largest unsorted element 'bubbles up' to its correct position at the end.",
      purpose:
        "Simplest sorting algorithm to learn and implement. Stable and in-place, but slow on large data — used mainly as a teaching tool and on tiny or nearly-sorted arrays.",
      prerequisites: ["Arrays", "Loops and conditionals", "Swapping two values"],
      coreConcepts: [
        { title: "Pass mechanism", explanation: "Each pass walks through the unsorted portion comparing adjacent items. After pass k, the last k elements are in their final position." },
        { title: "Optimisation — early exit", explanation: "If a pass completes with zero swaps, the array is already sorted and we can stop. This makes best case O(n)." },
        { title: "Stability", explanation: "Equal elements never swap past each other, so bubble sort is stable — useful when secondary ordering must be preserved." },
        { title: "Complexity", explanation: "Worst & average case: O(n²) comparisons and swaps. Best case (already sorted): O(n) with early-exit. Space: O(1), in-place." },
      ],
      stepByStep: [
        "Start with i = 0 (pass counter).",
        "For j from 0 to n-i-2, compare arr[j] and arr[j+1].",
        "If arr[j] > arr[j+1], swap them.",
        "After the inner loop, the largest of the unsorted part is at position n-i-1.",
        "Increment i. If no swaps happened in the last pass, stop.",
      ],
      examples: [
        { title: "Sort [5, 3, 8, 1]", content: "Pass 1: [3,5,8,1]→[3,5,1,8]→[3,1,5,8] (8 settled). Pass 2: [1,3,5,8] (5 settled). Pass 3: no swap → done." },
        { title: "Already sorted [1,2,3]", content: "With early exit, one pass with zero swaps stops the algorithm → best case O(n)." },
      ],
      commonErrors: [
        "Inner loop boundary off-by-one — must be n-i-1, not n.",
        "Forgetting the swapped flag — loses the O(n) best case.",
        "Swapping with a temporary variable incorrectly — loses data.",
      ],
      examPoints: [
        "Algorithm written in pseudocode or C.",
        "Trace a 4–5 element array across passes.",
        "Complexity table: best O(n), avg/worst O(n²), space O(1).",
        "Stable and adaptive (with the swap flag).",
      ],
      summary:
        "Bubble sort compares adjacent pairs and swaps them, 'bubbling' the largest remaining element to the end each pass. Worst case O(n²), best case O(n) with early exit, stable and in-place.",
    },
    simplify: {
      simpleEnglish:
        "Imagine students lined up by height. You walk down the line comparing each pair; if a taller student is in front of a shorter one, swap them. After each walk, the tallest unsorted student has moved to the back. Repeat until no swaps are needed.",
      hinglish:
        "Line mein khade students ko height ke hisaab se arrange karna hai. Har pair compare karo, agar pehle wala bada hai to swap kar do. Har round mein sabse bada student end mein chala jaata hai. Jab tak koi swap na ho, repeat karo.",
      analogy:
        "Bubbles in a glass of soda — the biggest bubbles rise to the top first. In bubble sort, the biggest number 'rises' to the end of the array in each pass.",
      fiveMinute:
        "Minute 1: definition and intuition. Minute 2: pseudocode on board. Minute 3: trace [5,3,8,1]. Minute 4: complexity table. Minute 5: optimisation with swap flag.",
      oneMinuteRecap:
        "Bubble sort: compare adjacent pairs, swap if needed, largest bubbles to end each pass. O(n²) worst, O(n) best with early exit. Stable, in-place.",
      examFormat:
        "Expect a 4-mark trace on a small array and a 2-mark complexity question. Always show swaps explicitly and circle the elements in their final position after each pass.",
    },
    visualise: {
      type: "animation",
      description:
        "Animated bar chart. The algorithm highlights two adjacent bars in orange, swaps them when out of order (with a brief upward bounce), and shades the sorted tail green. A pass counter and swap counter display below.",
      steps: [
        "Render 6 vertical bars of different heights representing the array.",
        "Highlight bars at indices 0 and 1 in orange.",
        "If left > right, animate the swap with a smooth bounce.",
        "Slide the highlight to indices 1 and 2.",
        "Continue to end of unsorted region; turn the last bar green.",
        "Reset to the start; repeat passes.",
        "When a pass shows zero swaps, all bars turn green and 'SORTED' displays.",
      ],
      reducedMotionAlt:
        "Show each pass as a static row of the array, with a coloured marker indicating which pair was compared and which elements are now in final position.",
    },
    practise: {
      guidedExamples: [
        { question: "Sort [4, 2, 7, 1, 3] with bubble sort — list passes.", solution: "Pass1: [2,4,1,3,7] Pass2: [2,1,3,4,7] Pass3: [1,2,3,4,7] Pass4: no swaps, done." },
        { question: "How many comparisons for n=5 in worst case?", solution: "(n-1)+(n-2)+…+1 = n(n-1)/2 = 10 comparisons." },
      ],
      easyQuestions: [
        "What is the worst-case time complexity of bubble sort?",
        "Is bubble sort stable?",
        "What extra memory does bubble sort need?",
      ],
      mediumQuestions: [
        "Trace bubble sort on [3, 1, 4, 1, 5] showing each pass.",
        "How does the early-exit flag change the best case?",
        "Compare bubble sort with selection sort in one line.",
      ],
      hardQuestions: [
        "Prove that after the i-th pass, the last i elements are in their final positions.",
        "For an already-sorted array of n elements, how many comparisons does optimised bubble sort make?",
      ],
      hints: [
        "Outer loop runs n-1 times in the worst case.",
        "Use a 'swapped' boolean for early exit.",
        "Inner loop length shrinks each pass.",
      ],
    },
    revise: {
      shortNotes: [
        "Compares adjacent pairs, swaps if out of order.",
        "Largest unsorted element settles at the end each pass.",
        "Worst & avg: O(n²). Best (optimised): O(n).",
        "Stable and in-place (O(1) extra space).",
        "Adaptive with the swap flag.",
      ],
      definitions: [
        { term: "Bubble Sort", definition: "Comparison-based sort that repeatedly swaps adjacent out-of-order elements, bubbling the largest to the end each pass." },
        { term: "Stable Sort", definition: "A sort that preserves the relative order of equal elements." },
      ],
      formulas: [
        { name: "Comparisons", formula: "n(n-1)/2", use: "Worst-case comparisons in bubble sort." },
        { name: "Swaps (worst)", formula: "n(n-1)/2", use: "Maximum swaps when array is reverse-sorted." },
      ],
      flashcards: [
        { front: "Worst case of bubble sort?", back: "O(n²)." },
        { front: "Best case (optimised)?", back: "O(n)." },
        { front: "Stable?", back: "Yes." },
      ],
      commonConfusions: [
        { a: "Bubble sort", b: "Selection sort", difference: "Bubble swaps adjacent pairs repeatedly; selection finds the minimum and swaps it into place once per pass." },
        { a: "Stable", b: "In-place", difference: "Stable = preserves order of equal keys; in-place = uses O(1) extra memory. Bubble sort is both." },
      ],
    },
  },

  // ==========================================================================
  // DS — stack-basics
  // ==========================================================================
  {
    subjectCode: "CS201",
    topicSlug: "stack-basics",
    title: "Stack Basics (LIFO)",
    order: 10,
    durationMin: 12,
    learn: {
      definition:
        "A stack is a linear data structure that follows the Last-In-First-Out (LIFO) principle: the element inserted last is the first to be removed. Insertion is called push, removal is called pop, and inspecting the top element without removing it is called peek (or top).",
      purpose:
        "Stacks model any 'undo' or 'backtrack' scenario: browser history, function call frames, expression evaluation, balanced parentheses, depth-first search. The LIFO rule naturally reverses order.",
      prerequisites: ["Arrays", "Pointers (for linked-list implementation)", "Function call basics"],
      coreConcepts: [
        { title: "Operations", explanation: "push(x) — add x at top; pop() — remove and return top; peek()/top() — return top without removing; isEmpty() — check if stack has no elements." },
        { title: "Array implementation", explanation: "Use an integer 'top' index starting at -1. push increments top and stores value; pop reads and decrements top. Overflow when top == capacity-1; underflow when top == -1." },
        { title: "Linked-list implementation", explanation: "push inserts a new node at the head; pop removes the head. No fixed capacity — limited only by heap memory." },
        { title: "LIFO behaviour", explanation: "Pushing 1,2,3 then popping returns 3,2,1 — reverse of insertion order. This is the key property exploited by recursion and undo systems." },
      ],
      stepByStep: [
        "Initialise top = -1 (array) or head = NULL (linked list).",
        "To push: check overflow; increment top; store value at arr[top].",
        "To pop: check underflow; read arr[top]; decrement top; return value.",
        "To peek: check empty; return arr[top] without modifying top.",
        "To check empty: return (top == -1).",
      ],
      examples: [
        { title: "Browser back button", content: "Each visited URL is pushed. Clicking Back pops the current URL and shows the previous one — classic LIFO." },
        { title: "Function call stack", content: "main() calls f() which calls g(). When g() returns, control goes back to f(), not main — LIFO unwinding." },
        { title: "Balanced parentheses", content: "Push opening brackets; on closing bracket, check if top matches. At end, stack must be empty." },
      ],
      commonErrors: [
        "Forgetting underflow check before pop — returns garbage.",
        "Forgetting overflow check before push — overwrites adjacent memory.",
        "Confusing LIFO with FIFO (that's a queue).",
      ],
      examPoints: [
        "Definition with LIFO principle.",
        "All four operations with their O(1) complexity.",
        "Array vs linked-list implementation in one line each.",
        "Any two real applications (recursion, expression conversion, balanced brackets).",
      ],
      summary:
        "A stack is a LIFO structure supporting push, pop, peek and isEmpty in O(1). Implemented with an array (using a top index) or a linked list (head pointer). Used for recursion, undo and bracket matching.",
    },
    simplify: {
      simpleEnglish:
        "A stack is like a stack of plates. You add a plate on top (push) and you take the topmost plate off (pop). You cannot reach a plate in the middle without removing those above it. Last plate placed is the first one taken.",
      hinglish:
        "Stack ekdum plate ke pile jaisa hai. Plate upar rakho (push), sabse upar wali plate uthao (pop). Beech ki plate nahi nikal sakte bina upar wali hataaye. Jo plate sabse last mein rakhi, wahi sabse pehle niklegi — LIFO.",
      analogy:
        "Think of a Pringles can. You can only take chips from the top. The last chip packed is the first one you eat.",
      fiveMinute:
        "Minute 1: definition + LIFO. Minute 2: four operations with diagrams. Minute 3: array implementation pseudocode. Minute 4: linked-list implementation. Minute 5: two applications.",
      oneMinuteRecap:
        "Stack = LIFO. Operations: push, pop, peek, isEmpty — all O(1). Array uses top index; linked list uses head. Apps: recursion, undo, bracket matching.",
      examFormat:
        "Expect a 3-mark definition + operations question and a 4-mark implementation. Drawing the stack with arrows for top is essential.",
    },
    visualise: {
      type: "interactive",
      description:
        "An interactive vertical column representing the stack. Buttons for Push, Pop, Peek and Clear. Pushing adds a coloured block on top with a bounce; popping removes the top block with a slide-up animation. Overflow and underflow trigger red flashes.",
      steps: [
        "Render an empty vertical container labelled 'Stack'.",
        "Show Push / Pop / Peek / Clear buttons below.",
        "On Push: animate a new coloured block sliding in from the right and settling on top.",
        "On Pop: animate the top block sliding up and fading.",
        "On Peek: highlight the top block in yellow without removing.",
        "If Push when full: red flash 'OVERFLOW'.",
        "If Pop when empty: red flash 'UNDERFLOW'.",
      ],
      reducedMotionAlt:
        "Display the stack as a static list with a 'top' pointer arrow; each button press updates the list instantly without animation.",
    },
    practise: {
      guidedExamples: [
        { question: "Push 10, 20, 30 then pop twice. What remains?", solution: "After pushes: [10,20,30] (top=30). Pop→30. Pop→20. Remaining: [10], top=10." },
        { question: "Use a stack to check if '(())' is balanced.", solution: "Push on '('. On ')' pop. After processing all chars, stack is empty → balanced." },
      ],
      easyQuestions: [
        "What does LIFO stand for?",
        "Name the four basic stack operations.",
        "Which operation reads the top without removing it?",
      ],
      mediumQuestions: [
        "Show the array implementation of push and pop.",
        "Convert infix 'A+B' to postfix using a stack.",
        "Why is the time complexity of each stack operation O(1)?",
      ],
      hardQuestions: [
        "Implement two stacks in a single array efficiently.",
        "Design a stack that supports getMin() in O(1) time.",
      ],
      hints: [
        "Always check underflow before pop, overflow before push.",
        "Linked-list stack: push at head, pop at head.",
        "LIFO = reverse order of insertion.",
      ],
    },
    revise: {
      shortNotes: [
        "Stack = LIFO linear structure.",
        "Operations: push, pop, peek, isEmpty — all O(1).",
        "Array impl: top index starts at -1.",
        "Linked-list impl: head is the top.",
        "Apps: recursion, undo, bracket matching, infix→postfix.",
      ],
      definitions: [
        { term: "Stack", definition: "A LIFO linear data structure where insertion and removal happen at the same end (top)." },
        { term: "Overflow", definition: "Attempting to push onto a full (array-based) stack." },
        { term: "Underflow", definition: "Attempting to pop or peek from an empty stack." },
      ],
      formulas: [],
      flashcards: [
        { front: "LIFO full form?", back: "Last-In-First-Out." },
        { front: "push/pop complexity?", back: "O(1)." },
        { front: "Top initial value (array)?", back: "-1." },
      ],
      commonConfusions: [
        { a: "Stack", b: "Queue", difference: "Stack is LIFO (one end); queue is FIFO (two ends — rear for insert, front for remove)." },
        { a: "Peek", b: "Pop", difference: "Peek returns the top without removing; pop removes it." },
      ],
    },
  },

  // ==========================================================================
  // DS — singly-linked-list
  // ==========================================================================
  {
    subjectCode: "CS201",
    topicSlug: "singly-linked-list",
    title: "Singly Linked List",
    order: 13,
    durationMin: 14,
    learn: {
      definition:
        "A singly linked list is a linear, dynamic data structure consisting of nodes. Each node contains two parts: a data field and a pointer (called 'next') to the next node. The list starts at a 'head' pointer and ends when next is NULL.",
      purpose:
        "Unlike arrays, linked lists grow and shrink at runtime without resizing or shifting elements. Insertion and deletion at the head are O(1). Used for polynomials, adjacency lists, hash chains and as the backbone of stacks and queues.",
      prerequisites: ["Pointers in C/C++", "Dynamic memory (malloc/new)", "Structures"],
      coreConcepts: [
        { title: "Node structure", explanation: "struct Node { int data; struct Node* next; }; — each node holds a value and a link to the next node." },
        { title: "Head pointer", explanation: "A special pointer holds the address of the first node. If head == NULL the list is empty. Losing head means losing the entire list." },
        { title: "Traversal", explanation: "Start at head, visit data, move to next, repeat until NULL. Access is O(n) — no random access like arrays." },
        { title: "Insertion cases", explanation: "Insert at head (O(1)), at tail (O(n) without tail pointer), or after a given node (O(n) to find + O(1) to link)." },
        { title: "Deletion cases", explanation: "Delete head (O(1)), delete by value (O(n) search + O(1) unlink). Always free the removed node to avoid memory leaks." },
      ],
      stepByStep: [
        "To insert at head: create node; set its next to current head; update head to new node.",
        "To insert at tail: traverse to the last node; set its next to new node; new node's next is NULL.",
        "To delete head: store head in a temp; move head to head->next; free temp.",
        "To delete by value: traverse keeping a 'prev' pointer; unlink prev->next = curr->next; free curr.",
        "To traverse: while (ptr != NULL) { visit ptr->data; ptr = ptr->next; }",
      ],
      examples: [
        { title: "List 10 → 20 → 30", content: "head → [10|•] → [20|•] → [30|NULL]. Three nodes; last node's next is NULL." },
        { title: "Insert 5 at head", content: "New node [5|•] points to old head; head now points to [5|•]. Result: 5 → 10 → 20 → 30." },
        { title: "Delete 20", content: "Traverse keeping prev = node(10). prev->next = node(20).next = node(30). Free node(20)." },
      ],
      commonErrors: [
        "Losing the head pointer before re-linking — leaks the whole list.",
        "Forgetting to free deleted nodes — memory leak.",
        "Not handling the empty-list (head == NULL) case.",
        "Dereferencing NULL when the list ends — segmentation fault.",
      ],
      examPoints: [
        "Node structure and a labelled diagram.",
        "Insertion at head and tail with C code.",
        "Deletion by value with C code.",
        "Comparison with arrays (size, access, insertion cost).",
      ],
      summary:
        "A singly linked list is a chain of nodes connected by 'next' pointers. It is dynamic, supports O(1) head insertion/deletion, but has O(n) random access and search. Always free deleted nodes and never lose the head pointer.",
    },
    simplify: {
      simpleEnglish:
        "Imagine a treasure hunt where each clue tells you where the next clue is. You start at the first clue (head) and follow the chain until there is no next clue (NULL). To add a new clue, you just point the last clue at it.",
      hinglish:
        "Treasure hunt samjho — har clue agle clue ka address deta hai. Head se start karo, ek-ek karke next pointer follow karo, jab NULL mile to ruk. Naya node add karna ho to last node ka next usse point karwa do.",
      analogy:
        "A train where each coach is connected to the next by a coupling. You can add or remove a coach just by changing one coupling — no need to move the other coaches.",
      fiveMinute:
        "Minute 1: node structure + diagram. Minute 2: traversal. Minute 3: insert at head (code). Minute 4: delete by value (code). Minute 5: array vs linked list comparison.",
      oneMinuteRecap:
        "Linked list = nodes with data + next pointer. Head is start, NULL is end. O(1) head insert/delete, O(n) search. Dynamic size.",
      examFormat:
        "Likely a 5-mark code question (insert at head/tail or delete by value) plus a 3-mark comparison with arrays. Always draw the node diagram first.",
    },
    visualise: {
      type: "animation",
      description:
        "Boxes representing nodes appear left-to-right, each with a 'data' slot and a 'next' arrow. Animations show insertions linking a new box at head/tail, deletions unlinking a box and freeing it, and traversal moving a highlighter across nodes.",
      steps: [
        "Render three node boxes connected by arrows; mark the first as 'head'.",
        "On Insert at Head: animate a new box entering from above, its arrow pointing to old head, head label moving to it.",
        "On Insert at Tail: traverse highlight to last node; new box appears; last node's arrow points to it.",
        "On Delete: unlink arrow from previous to target, fade target out, mark 'freed'.",
        "On Traverse: a yellow dot hops from head through each node to NULL.",
      ],
      reducedMotionAlt:
        "Show static before/after snapshots for each operation with explicit 'freed' markers on deleted nodes.",
    },
    practise: {
      guidedExamples: [
        { question: "Insert 7 at head of list 5 → 9.", solution: "new node(7)->next = head; head = new node(7). Result: 7 → 5 → 9." },
        { question: "Delete 9 from 7 → 5 → 9.", solution: "prev = node(5); prev->next = NULL; free node(9)." },
      ],
      easyQuestions: [
        "What is the structure of a singly linked list node?",
        "What is the value of the last node's next pointer?",
        "Is random access O(1) like in arrays?",
      ],
      mediumQuestions: [
        "Write C code to insert a node at the head.",
        "Write C code to delete a node by value.",
        "Why is head insertion O(1) but tail O(n) without a tail pointer?",
      ],
      hardQuestions: [
        "Reverse a singly linked list in O(n) time and O(1) space.",
        "Detect a cycle in a linked list (Floyd's algorithm).",
      ],
      hints: [
        "Always keep a 'prev' pointer during deletion.",
        "Free the deleted node to avoid leaks.",
        "Check head == NULL before traversing.",
      ],
    },
    revise: {
      shortNotes: [
        "Node = data + next pointer.",
        "Head points to first node; last node's next is NULL.",
        "Insertion at head: O(1). Insertion at tail: O(n) without tail pointer.",
        "Search / random access: O(n).",
        "Dynamic size — no resizing needed.",
      ],
      definitions: [
        { term: "Linked List", definition: "A linear dynamic structure of nodes connected via pointers." },
        { term: "Node", definition: "A structure holding data and a pointer to the next node." },
        { term: "Head", definition: "Pointer to the first node of a linked list; NULL when the list is empty." },
      ],
      formulas: [],
      flashcards: [
        { front: "Time complexity of head insertion?", back: "O(1)." },
        { front: "Last node's next value?", back: "NULL." },
        { front: "Random access in linked list?", back: "Not possible — must traverse, O(n)." },
      ],
      commonConfusions: [
        { a: "Array", b: "Linked list", difference: "Array has O(1) random access and fixed size; linked list has O(n) access but dynamic size and O(1) head insertion." },
        { a: "Singly", b: "Doubly linked", difference: "Singly has only 'next'; doubly has 'prev' too, enabling backward traversal at the cost of extra memory." },
      ],
    },
  },

  // ==========================================================================
  // OOP — classes-objects-basics
  // ==========================================================================
  {
    subjectCode: "CS202",
    topicSlug: "classes-objects-basics",
    title: "Classes and Objects Basics",
    order: 1,
    durationMin: 14,
    learn: {
      definition:
        "A class is a user-defined blueprint that bundles data (member variables) and the functions that operate on that data (member functions) into a single unit. An object is an instance of a class — a concrete variable that occupies memory and holds actual values.",
      purpose:
        "Classes implement encapsulation: data and the operations on it live together, and access can be restricted through public/private/protected specifiers. This makes large programs modular, secure and easier to maintain.",
      prerequisites: ["Structures in C", "Functions", "Basic C++ syntax"],
      coreConcepts: [
        { title: "Class declaration", explanation: "class Student { private: int roll; public: void setRoll(int r){roll=r;} int getRoll(){return roll;} }; — ends with a semicolon." },
        { title: "Access specifiers", explanation: "private members are accessible only inside the class (default for class). public members are accessible from outside. protected is for inheritance." },
        { title: "Object creation", explanation: "Student s1; creates an object. Each object has its own copy of data members; member functions are shared. s1.setRoll(5); calls the function on s1." },
        { title: "Member function definition", explanation: "Can be defined inside the class (implicitly inline) or outside using the scope resolution operator: void Student::setRoll(int r){ roll = r; }" },
        { title: "Memory layout", explanation: "Each object stores only its data members. Member functions live in a single shared copy. sizeof(object) = sum of non-static data member sizes (with padding)." },
      ],
      stepByStep: [
        "Identify the real-world entity (e.g., Student) and its attributes (roll, name, marks) and behaviours (setRoll, display).",
        "Declare the class with private data and public functions.",
        "Define member functions inside or outside the class.",
        "Create objects in main(): Student s1, s2;",
        "Call public methods on the objects: s1.setRoll(1); s1.display();",
      ],
      examples: [
        { title: "Student class", content: "class Student { int roll; string name; public: void set(int r, string n){roll=r; name=n;} void show(){cout<<roll<<\" \"<<name;} };" },
        { title: "Two objects", content: "Student a, b; a.set(1,\"Aarati\"); b.set(2,\"Priya\"); — a and b each have their own roll and name." },
      ],
      commonErrors: [
        "Forgetting the semicolon after the closing brace of a class — compile error.",
        "Accessing private members directly from main() — access error.",
        "Declaring a class but forgetting to create an object — nothing runs.",
        "Confusing the class (blueprint) with the object (instance).",
      ],
      examPoints: [
        "Definition of class and object with one example.",
        "Access specifiers and their meanings.",
        "Program to define a class, create an object and call methods.",
        "Why data is private and functions are public (encapsulation).",
      ],
      summary:
        "A class is a blueprint bundling data and functions; an object is an instance. Data is usually private (encapsulation), functions public. Each object has its own data; functions are shared. Always end a class declaration with a semicolon.",
    },
    simplify: {
      simpleEnglish:
        "A class is a blueprint — like the design of a house. An object is an actual house built from that blueprint. You can build many houses from one design, each with its own paint and furniture but the same room layout.",
      hinglish:
        "Class ek blueprint hai — jaise ghar ka naksha. Object uss naksha se banaya gaya asli ghar. Ek naksha, kitne hi ghar bana lo. Har ghar ka paint aur furniture alag, lekin layout same.",
      analogy:
        "Cookie cutter (class) and cookies (objects). One cutter makes many cookies; each cookie can have different sprinkles (data) but the same shape (structure).",
      fiveMinute:
        "Minute 1: class & object definition. Minute 2: write a simple class with one private member. Minute 3: add a public setter and getter. Minute 4: create objects in main and call methods. Minute 5: explain access specifiers.",
      oneMinuteRecap:
        "Class = blueprint (data + functions). Object = instance. Data private, functions public. End class with semicolon. Use dot operator to call methods on objects.",
      examFormat:
        "Expect a 5-mark program: define a class, create two objects, set and display data. Always comment each section (data members, member functions, main).",
    },
    visualise: {
      type: "diagram",
      description:
        "Two-panel diagram. Left: the 'Class' box with sections for private data (roll, name) and public functions (set, show). Right: two 'Object' boxes (s1, s2), each showing only their own data values — functions point back to the shared class.",
      steps: [
        "Draw a rectangle labelled 'Class Student' with two horizontal sections.",
        "Top section 'private': list roll, name.",
        "Bottom section 'public': list set(), show().",
        "Draw two smaller boxes labelled 's1' and 's2' to the right.",
        "In s1 write roll=1, name=Aarati; in s2 write roll=2, name=Priya.",
        "Draw dashed arrows from each object to the public functions of the class — showing they share methods.",
      ],
      reducedMotionAlt:
        "Use a static two-column table: left column lists class members; right column lists two objects with their data values.",
    },
    practise: {
      guidedExamples: [
        { question: "Define a Rectangle class with length and breadth, and a method area().", solution: "class Rectangle { float l,b; public: void set(float x,float y){l=x;b=y;} float area(){return l*b;} };" },
        { question: "Create two Rectangle objects with different sizes and print their areas.", solution: "Rectangle r1,r2; r1.set(4,5); r2.set(3,6); cout<<r1.area()<<\" \"<<r2.area(); // 20 18" },
      ],
      easyQuestions: [
        "What is the default access specifier inside a C++ class?",
        "What does an object contain in memory?",
        "Which operator is used to access members of an object?",
      ],
      mediumQuestions: [
        "Write a class Book with title, price and a display() function.",
        "Define a member function outside the class using the scope resolution operator.",
        "Why are data members usually private?",
      ],
      hardQuestions: [
        "Explain the memory layout of an object — what is stored per object vs shared.",
        "Can two objects of the same class access each other's private members directly? Justify.",
      ],
      hints: [
        "End a class declaration with a semicolon.",
        "Use dot (.) for objects, arrow (->) for pointers.",
        "Functions are shared; data is per-object.",
      ],
    },
    revise: {
      shortNotes: [
        "Class = blueprint; object = instance.",
        "Data members usually private; member functions public.",
        "Default access in class is private (struct is public).",
        "End class declaration with semicolon.",
        "Member functions can be defined inside (inline) or outside (Class::fn).",
      ],
      definitions: [
        { term: "Class", definition: "A user-defined type bundling data and functions." },
        { term: "Object", definition: "An instance of a class that holds actual values and occupies memory." },
        { term: "Encapsulation", definition: "Bundling data and functions into a class with controlled access via specifiers." },
      ],
      formulas: [],
      flashcards: [
        { front: "Default access in 'class'?", back: "private." },
        { front: "Default access in 'struct'?", back: "public." },
        { front: "Operator to access members?", back: "Dot (.) for objects, arrow (->) for pointers." },
      ],
      commonConfusions: [
        { a: "Class", b: "Object", difference: "Class is the blueprint; object is a concrete instance with its own data." },
        { a: "private", b: "protected", difference: "private members are not accessible in derived classes; protected members are." },
      ],
    },
  },

  // ==========================================================================
  // OOP — inheritance-basics
  // ==========================================================================
  {
    subjectCode: "CS202",
    topicSlug: "inheritance-basics",
    title: "Inheritance Basics",
    order: 7,
    durationMin: 14,
    learn: {
      definition:
        "Inheritance is the OOP mechanism by which a new class (derived class / child) acquires the properties (data members) and behaviours (member functions) of an existing class (base class / parent), allowing code reuse and hierarchical classification.",
      purpose:
        "Avoids rewriting common code. A Dog class inherits from Animal — all common attributes (age, weight) and methods (eat, sleep) come automatically; Dog adds only its specific members (bark). This enables the 'is-a' relationship and runtime polymorphism.",
      prerequisites: ["Classes and objects", "Access specifiers", "Constructors"],
      coreConcepts: [
        { title: "Syntax", explanation: "class Dog : public Animal { ... }; — colon, access mode, base class name. The access mode (public/private/protected) decides how base members appear in the derived class." },
        { title: "Types of inheritance", explanation: "Single (one parent, one child), Multiple (child has multiple parents), Multilevel (A→B→C), Hierarchical (one parent, many children), Hybrid (mix of two or more)." },
        { title: "Access modes", explanation: "public inheritance: public members of base remain public in derived, protected stays protected. private inheritance: everything becomes private in derived. protected inheritance: public & protected become protected." },
        { title: "Visibility of base members", explanation: "Private members of the base are never directly accessible in the derived class — only through public/protected base methods. Protected members are accessible in derived classes but not outside." },
        { title: "Constructor call order", explanation: "When a derived object is created, the base constructor runs first, then the derived. On destruction, the order reverses: derived destructor first, then base." },
      ],
      stepByStep: [
        "Identify the common attributes/behaviours shared by a group of classes — these go in the base class.",
        "Write the base class with public/protected members (avoid private if derived classes need direct access).",
        "Declare the derived class with 'class Child : public Parent'.",
        "Add only the new members in the derived class.",
        "Construct a derived object — base constructor runs first automatically.",
      ],
      examples: [
        { title: "Animal → Dog", content: "class Animal { protected: int age; public: void eat(){cout<<\"eating\";} }; class Dog : public Animal { public: void bark(){cout<<\"barking\";} };" },
        { title: "Using both", content: "Dog d; d.eat(); // inherited from Animal d.bark(); // Dog's own d.age = 5; // OK because age is protected and accessible in Dog." },
      ],
      commonErrors: [
        "Trying to access base's private members directly in the derived class — not allowed.",
        "Forgetting the access mode (public/private) — defaults to private in 'class', making base methods unusable outside.",
        "Diamond problem in multiple inheritance without virtual base classes.",
        "Assuming private base members are inherited — they are inherited but not accessible.",
      ],
      examPoints: [
        "Definition with the 'is-a' relationship.",
        "Five types of inheritance with diagrams.",
        "Access mode table (public/private/protected inheritance).",
        "Constructor call order in single & multilevel inheritance.",
        "Diamond problem and the virtual base class solution.",
      ],
      summary:
        "Inheritance lets a derived class reuse a base class's members. Five types exist (single, multiple, multilevel, hierarchical, hybrid). Access modes decide visibility. Private base members are never directly accessible in derived. Base constructor runs before derived; destructors run in reverse.",
    },
    simplify: {
      simpleEnglish:
        "Inheritance is like a child inheriting traits from a parent. A Dog is an Animal, so it gets the eat() and sleep() methods for free and only needs to add bark(). You write the common code once in the parent and reuse it everywhere.",
      hinglish:
        "Inheritance matlab bachcha parent ke gun inherit kare. Dog ek Animal hai, to eat() aur sleep() free mein mil jaate hain, sirf bark() add karna padta hai. Common code ek baar parent mein likho, baaki sab reuse karo.",
      analogy:
        "Vehicle → Car → SportsCar. A Vehicle has wheels and a brake. A Car adds AC. A SportsCar adds turbo. Each level only adds what's new — everything else is inherited.",
      fiveMinute:
        "Minute 1: definition + is-a relationship. Minute 2: syntax and one example. Minute 3: five types with diagrams. Minute 4: access mode table. Minute 5: constructor order and diamond problem.",
      oneMinuteRecap:
        "Inheritance = derived class reuses base class members. Types: single, multiple, multilevel, hierarchical, hybrid. Private base members never directly accessible. Base ctor runs first.",
      examFormat:
        "Expect a 5-mark program (single inheritance) and a 4-mark question on types or access modes. Always draw the inheritance diagram with arrows from child to parent.",
    },
    visualise: {
      type: "diagram",
      description:
        "A class hierarchy tree. 'Animal' at the top, two arrows down to 'Dog' and 'Cat'. Each box has sections for inherited (shaded) and new (white) members. A side panel shows the constructor-call timeline: base ctor → derived ctor.",
      steps: [
        "Draw a top box labelled 'Animal' with age, eat(), sleep().",
        "Draw two boxes below labelled 'Dog' and 'Cat', each with arrows pointing up to Animal.",
        "In Dog add bark(); in Cat add meow(). Inherited members appear shaded.",
        "On the right, draw a vertical timeline: step 1 'Animal() ctor', step 2 'Dog() ctor', step 3 'object ready'.",
        "Reverse the arrows for destruction: 'Dog dtor' then 'Animal dtor'.",
      ],
      reducedMotionAlt:
        "Use a static two-column layout: left shows the class tree, right shows the ctor/dtor timeline as a numbered list.",
    },
    practise: {
      guidedExamples: [
        { question: "Define Person (name, age) and derive Student (rollNo, display()).", solution: "class Person{protected:string name;int age;public:void set(string n,int a){name=n;age=a;}}; class Student:public Person{int roll;public:void setStudent(string n,int a,int r){set(n,a);roll=r;} void show(){cout<<name<<\" \"<<age<<\" \"<<roll;}};" },
        { question: "What is the constructor call order for: class C : public B (and B : public A)?", solution: "When a C object is created: A() → B() → C(). Destructors run in reverse: ~C → ~B → ~A." },
      ],
      easyQuestions: [
        "Which keyword is used to derive a class?",
        "Name the five types of inheritance.",
        "Which access specifier allows access in derived classes but not outside?",
      ],
      mediumQuestions: [
        "Write a single inheritance program with Vehicle and Car.",
        "Differentiate between public and private inheritance.",
        "Why are private members of the base not accessible in the derived class?",
      ],
      hardQuestions: [
        "Explain the diamond problem and how virtual base classes resolve it.",
        "Write a multilevel inheritance example (A→B→C) showing constructor call order.",
      ],
      hints: [
        "Use 'public' inheritance for the usual 'is-a' relationship.",
        "Protected members are visible in derived classes but not outside.",
        "Base constructor runs before derived constructor.",
      ],
    },
    revise: {
      shortNotes: [
        "Inheritance = derived class reuses base class members.",
        "Five types: single, multiple, multilevel, hierarchical, hybrid.",
        "Access modes: public, private, protected.",
        "Private base members are inherited but not directly accessible.",
        "Constructor order: base → derived. Destructor order: derived → base.",
      ],
      definitions: [
        { term: "Inheritance", definition: "Mechanism by which a class acquires members of an existing class." },
        { term: "Base class", definition: "The parent class whose members are inherited." },
        { term: "Diamond problem", definition: "Ambiguity arising when a class inherits two classes that share a common base; solved with virtual inheritance." },
      ],
      formulas: [],
      flashcards: [
        { front: "Types of inheritance?", back: "Single, multiple, multilevel, hierarchical, hybrid." },
        { front: "Base ctor vs derived ctor order?", back: "Base first, then derived." },
        { front: "Access to private base members in derived?", back: "Not directly accessible — use public/protected base methods." },
      ],
      commonConfusions: [
        { a: "Inheritance", b: "Composition", difference: "Inheritance is 'is-a' (Dog is an Animal); composition is 'has-a' (Car has an Engine)." },
        { a: "protected", b: "private", difference: "protected members are accessible in derived classes; private members are not." },
      ],
    },
  },

  // ==========================================================================
  // MP — 8086-registers
  // ==========================================================================
  {
    subjectCode: "CS203",
    topicSlug: "8086-registers",
    title: "8086 Registers",
    order: 2,
    durationMin: 14,
    learn: {
      definition:
        "The Intel 8086 microprocessor has fourteen 16-bit registers grouped into four categories: general-purpose (AX, BX, CX, DX), pointer/index (SP, BP, SI, DI), segment (CS, DS, SS, ES) and the Instruction Pointer (IP) with the FLAGS register.",
      purpose:
        "Registers are the fastest storage inside the CPU. Every arithmetic, logic, addressing and control operation uses them. Understanding which register does what is essential to write efficient assembly code.",
      prerequisites: ["Binary and hex number systems", "Concept of memory addresses", "8086 architecture overview"],
      coreConcepts: [
        { title: "General-purpose registers (AX, BX, CX, DX)", explanation: "Each 16-bit register can be split into two 8-bit halves: AH/AL, BH/BL, CH/CL, DH/DL. AX = accumulator (math), BX = base (addressing), CX = count (loops), DX = data (I/O)." },
        { title: "Pointer & index registers", explanation: "SP (Stack Pointer) — top of stack; BP (Base Pointer) — references parameters on stack; SI (Source Index) — source for string ops; DI (Destination Index) — destination for string ops." },
        { title: "Segment registers", explanation: "CS (Code Segment), DS (Data Segment), SS (Stack Segment), ES (Extra Segment). Each is 16-bit. Combined with an offset (IP, SI, DI, SP, etc.) they form 20-bit physical addresses." },
        { title: "Instruction Pointer (IP)", explanation: "16-bit register that holds the offset of the next instruction to execute. CPU increments IP after fetching; jump/call instructions modify IP." },
        { title: "FLAGS register", explanation: "16-bit register where each bit is a flag. Important ones: CF (carry), PF (parity), AF (aux carry), ZF (zero), SF (sign), OF (overflow), TF (trap), IF (interrupt), DF (direction)." },
      ],
      stepByStep: [
        "To do arithmetic: load operands into AX, use ADD/SUB, result in AX, flags updated automatically.",
        "To start a loop: load count in CX, use LOOP instruction — it decrements CX and jumps if CX ≠ 0.",
        "To address memory: combine a segment (DS, SS, etc.) with an offset (SI, DI, BP, BX) using segment×16 + offset.",
        "To call a function: CALL pushes current IP onto the stack (SP decreases by 2); RET pops it back.",
        "To check a result: read ZF (zero), SF (sign), CF (carry) flags after an arithmetic instruction.",
      ],
      examples: [
        { title: "Add two numbers", content: "MOV AX, 5; MOV BX, 3; ADD AX, BX; — AX becomes 8, flags updated (ZF=0 since result ≠ 0)." },
        { title: "Loop counter", content: "MOV CX, 5; L1: ... LOOP L1; — body runs 5 times. LOOP decrements CX and jumps back if CX ≠ 0." },
        { title: "String copy", content: "MOV SI, offset source; MOV DI, offset dest; MOVSB; — copies a byte from DS:SI to ES:DI and updates SI, DI." },
      ],
      commonErrors: [
        "Using CX for arithmetic when it's the loop counter — overwrites the count.",
        "Forgetting that segment registers are 16-bit but address 64 KB segments.",
        "Confusing SP (stack top) with BP (parameter reference).",
        "Not updating DS/ES before accessing data in a different segment.",
      ],
      examPoints: [
        "List of all 14 registers with their sizes.",
        "Four categories with examples.",
        "Special uses of AX (accumulator), CX (counter), DX (I/O), SI/DI (string ops).",
        "FLAGS register — names and meanings of CF, ZF, SF, OF, IF, TF, DF.",
        "Why the 8086 has segment registers (to address 1 MB with 16-bit registers).",
      ],
      summary:
        "The 8086 has 14 16-bit registers in four groups: general-purpose (AX–DX, each splittable into H/L), pointer/index (SP, BP, SI, DI), segment (CS, DS, SS, ES) and IP+FLAGS. AX is the accumulator, CX the loop counter, SI/DI for strings, and FLAGS tracks arithmetic outcomes.",
    },
    simplify: {
      simpleEnglish:
        "Registers are small, super-fast storage boxes inside the CPU. AX is the workbench where math happens, CX counts loops, BX holds addresses, DX handles big numbers and I/O. SI and DI point to strings, SP tracks the stack, IP points to the next instruction, and FLAGS tells you what just happened (zero? carry? sign?).",
      hinglish:
        "Registers CPU ke andar chhote tez storage boxes hain. AX = math ka workbench, CX = loop counter, BX = address, DX = bade numbers / I/O. SI aur DI strings ke liye, SP stack top, IP agla instruction, FLAGS batata hai result zero tha ya carry aaya.",
      analogy:
        "Think of the CPU as a kitchen. AX is the cutting board (where the action happens), CX is the timer (loop counter), BX is the recipe book holder, DX is the spice box, SI/DI are pointing fingers at ingredients, IP is the line you're reading in the recipe, and FLAGS are the smoke alarm & thermometer telling you what just happened.",
      fiveMinute:
        "Minute 1: four register categories with names. Minute 2: AX/BX/CX/DX special uses and H/L split. Minute 3: pointer & index registers. Minute 4: segment registers + addressing formula. Minute 5: IP and FLAGS bits.",
      oneMinuteRecap:
        "14 registers in 4 groups: AX–DX (general, splittable to H/L), SP/BP/SI/DI (pointer/index), CS/DS/SS/ES (segment), IP+FLAGS. AX=accumulator, CX=counter, SI/DI=string ops.",
      examFormat:
        "Expect a 5-mark question listing registers by category and a 3-mark question on FLAGS bits. Drawing the register file as a labelled table is the safest way to score.",
    },
    visualise: {
      type: "diagram",
      description:
        "A 4×4 grid of register boxes labelled AX, BX, CX, DX (with AH/AL splits), SP, BP, SI, DI, CS, DS, SS, ES, IP, FLAGS. Colour-coded by category: general-purpose (blue), pointer/index (green), segment (orange), control (red).",
      steps: [
        "Draw a table with four columns: General, Pointer/Index, Segment, Control.",
        "Under General: AX, BX, CX, DX — show AH/AL split inside each.",
        "Under Pointer/Index: SP, BP, SI, DI.",
        "Under Segment: CS, DS, SS, ES.",
        "Under Control: IP, FLAGS.",
        "Add a callout: 'AX = accumulator, CX = counter, DX = I/O, SI/DI = strings'.",
        "Add a second callout listing the key FLAGS bits: CF, PF, AF, ZF, SF, TF, IF, DF, OF.",
      ],
      reducedMotionAlt:
        "Render the same information as a static coloured table with a legend at the bottom.",
    },
    practise: {
      guidedExamples: [
        { question: "Which register would you use as a loop counter?", solution: "CX — the LOOP instruction automatically decrements CX and jumps if CX ≠ 0." },
        { question: "Compute physical address if CS = 0x1234 and IP = 0x0056.", solution: "Physical = (0x1234 << 4) + 0x0056 = 0x12340 + 0x0056 = 0x12396." },
      ],
      easyQuestions: [
        "How many registers does the 8086 have, and what is their size?",
        "Which register is the accumulator?",
        "What are the two halves of AX called?",
      ],
      mediumQuestions: [
        "List the four categories of 8086 registers with examples.",
        "Explain the special roles of CX, SI, DI, and DX.",
        "What does the FLAGS register contain? Name any five flags.",
      ],
      hardQuestions: [
        "Compute the physical address for SS:SP = 0x5000:0xFFFE.",
        "Explain why the 8086 needs segment registers when it has 16-bit general registers.",
      ],
      hints: [
        "AX/BX/CX/DX → split into H and L bytes.",
        "CX is the LOOP counter.",
        "Physical address = segment × 16 + offset.",
      ],
    },
    revise: {
      shortNotes: [
        "14 registers, all 16-bit.",
        "General: AX, BX, CX, DX (each splits to H/L).",
        "Pointer/Index: SP, BP, SI, DI.",
        "Segment: CS, DS, SS, ES.",
        "Control: IP, FLAGS.",
        "AX = accumulator, CX = counter, DX = I/O, SI/DI = strings.",
      ],
      definitions: [
        { term: "Register", definition: "A small fast storage location inside the CPU." },
        { term: "Accumulator (AX)", definition: "General-purpose register used by default for arithmetic operations." },
        { term: "FLAGS", definition: "16-bit status register whose bits indicate outcomes of operations (zero, carry, sign, etc.)." },
      ],
      formulas: [
        { name: "Physical address", formula: "(segment << 4) + offset", use: "20-bit address formed from 16-bit segment and 16-bit offset." },
      ],
      flashcards: [
        { front: "Loop counter register?", back: "CX." },
        { front: "How many general-purpose registers?", back: "Four: AX, BX, CX, DX." },
        { front: "Two halves of BX?", back: "BH and BL." },
      ],
      commonConfusions: [
        { a: "SP", b: "BP", difference: "SP points to the top of the stack; BP is used to reference parameters/local variables on the stack without changing SP." },
        { a: "IP", b: "PC", difference: "On the 8086 the program counter is called IP (Instruction Pointer); other CPUs call it PC — same concept." },
      ],
    },
  },

  // ==========================================================================
  // MP — addressing-modes
  // ==========================================================================
  {
    subjectCode: "CS203",
    topicSlug: "addressing-modes",
    title: "8086 Addressing Modes",
    order: 5,
    durationMin: 14,
    learn: {
      definition:
        "An addressing mode is the method the CPU uses to locate the operand (data) of an instruction. The 8086 supports several modes including register, immediate, direct, register indirect, based, indexed and based-indexed addressing.",
      purpose:
        "Different addressing modes let programmers write compact and flexible code. A loop counter uses register mode (fastest); an array traversal uses indexed mode; stack operations use based mode with BP.",
      prerequisites: ["8086 registers", "Memory segmentation", "Assembly instruction format"],
      coreConcepts: [
        { title: "Register addressing", explanation: "Both operands are registers. e.g. MOV AX, BX — copies BX into AX. Fastest mode; no memory access." },
        { title: "Immediate addressing", explanation: "Operand is a constant embedded in the instruction. e.g. MOV AX, 1234H — loads the literal 1234H into AX." },
        { title: "Direct addressing", explanation: "Operand's offset is given as a constant. e.g. MOV AX, [1234H] — loads the word at memory offset 1234H (in DS) into AX." },
        { title: "Register indirect", explanation: "Offset is held in a register (BX, BP, SI, or DI). e.g. MOV AX, [SI] — loads the word at DS:SI." },
        { title: "Based / Indexed", explanation: "Based uses BX or BP plus a displacement: MOV AX, [BX+8]. Indexed uses SI or DI plus a displacement: MOV AX, [SI+4]. BP-based addressing defaults to the SS segment." },
        { title: "Based-Indexed", explanation: "Combines a base (BX/BP) and an index (SI/DI) with optional displacement: MOV AX, [BX+SI+10] — used for 2D arrays." },
      ],
      stepByStep: [
        "Identify whether the operand is in a register, in the instruction itself, or in memory.",
        "If in memory, identify how the offset is computed (constant, register, base+displacement, etc.).",
        "Determine the default segment: BX, SI, DI default to DS; BP defaults to SS.",
        "Compute the physical address = segment × 16 + offset.",
        "Read/write the operand at that address.",
      ],
      examples: [
        { title: "Register mode", content: "ADD AX, BX — both operands are registers; result in AX." },
        { title: "Immediate mode", content: "MOV AL, 5 — moves the constant 5 into AL." },
        { title: "Indexed mode (array)", content: "MOV AX, [SI+2] — accesses element at offset SI+2 in DS; perfect for array traversal by incrementing SI." },
        { title: "Based mode (stack param)", content: "MOV AX, [BP+4] — accesses a parameter on the stack (BP+4 is in SS by default)." },
      ],
      commonErrors: [
        "Using a segment register as an operand in MOV — segment registers can only be loaded via another register or memory, not immediates.",
        "Forgetting that BP-based addressing defaults to SS, not DS.",
        "Confusing [1234H] (direct memory) with 1234H (immediate).",
        "Using CX or DX for memory addressing — only BX, BP, SI, DI are allowed inside [ ].",
      ],
      examPoints: [
        "Definition of addressing mode.",
        "List of all modes with one example each.",
        "Identify the addressing mode of a given instruction.",
        "Default segment rules: BX/SI/DI → DS, BP → SS.",
      ],
      summary:
        "Addressing modes define how operands are located. Register mode is fastest; immediate embeds the constant; direct uses a fixed offset; register indirect, based, indexed and based-indexed compute the offset at runtime. BP defaults to SS; BX/SI/DI default to DS.",
    },
    simplify: {
      simpleEnglish:
        "Addressing modes are the different ways the CPU finds the data an instruction needs. Sometimes data is in a register (register mode), sometimes it's a constant baked into the instruction (immediate), sometimes it's in memory at a fixed address (direct) or at an address computed from a register (indirect/based/indexed).",
      hinglish:
        "Addressing mode tarika hai jisse CPU operand dhoondhta hai. Register mode mein data register mein, immediate mein instruction ke andar, direct mein memory ke fixed address pe, aur indirect/based/indexed mein register se address calculate kar ke dhoondha jaata hai.",
      analogy:
        "It's like finding a book in a library. Register mode = book is in your hand. Immediate = you wrote the page number on the request slip itself. Direct = you ask for shelf 12, position 4. Indexed = you ask for shelf 12, position (4 + i) where i changes per request.",
      fiveMinute:
        "Minute 1: definition + why multiple modes. Minute 2: register & immediate modes with examples. Minute 3: direct & register indirect. Minute 4: based & indexed. Minute 5: based-indexed + default segment rules.",
      oneMinuteRecap:
        "Modes: register, immediate, direct, register indirect, based, indexed, based-indexed. BP → SS segment; BX/SI/DI → DS. Operand in [] = memory.",
      examFormat:
        "Expect a 5-mark 'identify the addressing mode' question with 4–5 instructions, and a 3-mark write-up of any three modes with examples.",
    },
    visualise: {
      type: "diagram",
      description:
        "A decision tree starts at 'Where is the operand?'. Branch 1: Register (box: MOV AX,BX). Branch 2: In instruction (box: MOV AX,5). Branch 3: In memory → sub-branches: Fixed offset (direct, [1234H]), Register-held offset (indirect, [SI]), Base+disp ([BX+8]), Index+disp ([SI+4]), Base+Index ([BX+SI]).",
      steps: [
        "Top node: 'Where is the operand?'",
        "Branch A 'In a register' → example 'MOV AX, BX' (Register mode).",
        "Branch B 'In the instruction' → example 'MOV AX, 5' (Immediate mode).",
        "Branch C 'In memory' with sub-branches.",
        "Sub-branch C1 'Fixed offset' → 'MOV AX, [1234H]' (Direct).",
        "Sub-branch C2 'Offset in a register' → 'MOV AX, [SI]' (Register indirect).",
        "Sub-branch C3 'Base + disp' → 'MOV AX, [BX+8]' (Based).",
        "Sub-branch C4 'Index + disp' → 'MOV AX, [SI+4]' (Indexed).",
        "Sub-branch C5 'Base + Index' → 'MOV AX, [BX+SI]' (Based-indexed).",
      ],
      reducedMotionAlt:
        "Render the decision tree as a static nested bullet list with examples in monospace font.",
    },
    practise: {
      guidedExamples: [
        { question: "Identify the addressing mode of: MOV AX, BX.", solution: "Both operands are registers → Register addressing mode." },
        { question: "Identify the mode of: MOV AX, [BP+6].", solution: "BP-based addressing with displacement 6; defaults to SS segment → Based addressing mode." },
      ],
      easyQuestions: [
        "Which addressing mode is fastest and why?",
        "What is immediate addressing? Give one example.",
        "Which registers can be used inside [ ] for memory addressing?",
      ],
      mediumQuestions: [
        "Differentiate direct and register-indirect addressing with examples.",
        "What is based addressing? Why is BP+disp used for stack parameters?",
        "List all addressing modes of the 8086.",
      ],
      hardQuestions: [
        "Write an instruction using based-indexed addressing and explain what it accesses.",
        "Why does [BP+4] default to the SS segment while [BX+4] defaults to DS?",
      ],
      hints: [
        "If operand is in [] → memory addressing.",
        "BX/SI/DI default to DS; BP defaults to SS.",
        "Immediate mode has no memory access.",
      ],
    },
    revise: {
      shortNotes: [
        "Register: both operands are registers (MOV AX, BX).",
        "Immediate: operand is a constant (MOV AX, 5).",
        "Direct: fixed offset (MOV AX, [1234H]).",
        "Register indirect: offset in a register (MOV AX, [SI]).",
        "Based: BX/BP + displacement (MOV AX, [BP+4]).",
        "Indexed: SI/DI + displacement (MOV AX, [SI+4]).",
        "Based-indexed: BX + SI/DI (+ disp) (MOV AX, [BX+SI+10]).",
        "BP-based → SS segment; BX/SI/DI → DS.",
      ],
      definitions: [
        { term: "Addressing Mode", definition: "The method the CPU uses to locate the operand of an instruction." },
        { term: "Effective Address (EA)", definition: "The offset of an operand in memory, computed by the addressing mode." },
      ],
      formulas: [
        { name: "Physical address", formula: "(segment × 16) + offset", use: "20-bit address from a 16-bit segment and a 16-bit offset." },
      ],
      flashcards: [
        { front: "Mode: MOV AX, 5?", back: "Immediate." },
        { front: "Mode: MOV AX, [SI]?", back: "Register indirect." },
        { front: "Default segment for [BP+2]?", back: "SS (stack segment)." },
      ],
      commonConfusions: [
        { a: "Direct", b: "Immediate", difference: "Direct addresses a memory location (MOV AX,[1234H]); immediate embeds the constant itself (MOV AX,1234H)." },
        { a: "Based", b: "Indexed", difference: "Based uses BX or BP; indexed uses SI or DI. Based is used for stack params, indexed for array traversal." },
      ],
    },
  },

  // ==========================================================================
  // DC — transmission-media
  // ==========================================================================
  {
    subjectCode: "CS204",
    topicSlug: "transmission-media",
    title: "Transmission Media",
    order: 4,
    durationMin: 12,
    learn: {
      definition:
        "Transmission media are the physical paths or channels through which data signals travel from a sender to a receiver. They are broadly classified as guided (wired) — twisted pair, coaxial cable, optical fibre — and unguided (wireless) — radio waves, microwaves, infrared.",
      purpose:
        "The choice of medium determines bandwidth, distance, cost, immunity to noise and security. A home Wi-Fi uses unguided radio; an undersea internet backbone uses guided optical fibre.",
      prerequisites: ["Basic signals (frequency, amplitude)", "Electromagnetic spectrum", "Concept of bandwidth"],
      coreConcepts: [
        { title: "Guided media", explanation: "Signal travels through a solid physical conductor. Three types: twisted pair (copper, cheap, for telephony/LAN), coaxial cable (shielded, for cable TV / old LAN), optical fibre (light pulses, highest bandwidth, longest distance)." },
        { title: "Twisted pair", explanation: "Two insulated copper wires twisted around each other to reduce crosstalk. UTP (unshielded) common in Ethernet; STP (shielded) for noisy environments. Category 5e/6 supports up to 1-10 Gbps over 100 m." },
        { title: "Coaxial cable", explanation: "Inner conductor surrounded by insulation, then a braided shield, then outer jacket. Better shielding than twisted pair; used for cable TV and old Ethernet (10BASE2)." },
        { title: "Optical fibre", explanation: "Core of glass/plastic carries light pulses by total internal reflection. Immune to electromagnetic interference, supports Gbps over tens of kilometres. Single-mode (long haul) vs multimode (short distance)." },
        { title: "Unguided media", explanation: "Signals propagate through free space. Radio waves (omnidirectional, penetrate walls — FM, Wi-Fi, cellular), microwaves (directional, line-of-sight — satellite, mobile backhaul), infrared (short range, blocked by walls — TV remote)." },
      ],
      stepByStep: [
        "Identify the distance and required data rate.",
        "Consider the environment (office, industrial, outdoor, undersea).",
        "Compare candidate media on bandwidth, attenuation, noise immunity and cost.",
        "For short, indoor links: twisted pair or Wi-Fi.",
        "For long, high-bandwidth links: optical fibre or microwave/satellite.",
      ],
      examples: [
        { title: "Ethernet LAN", content: "Cat 6 UTP connects PCs to a switch at up to 10 Gbps over 100 m — cheap and easy to terminate." },
        { title: "Cable TV", content: "Coaxial cable carries hundreds of channels over a few km from the local node to homes." },
        { title: "Internet backbone", content: "Submarine optical fibre cables interconnect continents at terabits per second over thousands of km using optical amplifiers." },
        { title: "Wi-Fi", content: "Radio waves at 2.4/5 GHz carry data between a router and laptops within ~30 m indoors." },
      ],
      commonErrors: [
        "Confusing shielded (STP) and unshielded (UTP) twisted pair.",
        "Forgetting that optical fibre uses light, not electricity — hence immune to EMI.",
        "Assuming microwaves can penetrate obstacles — they require line-of-sight.",
        "Mixing up single-mode and multimode fibre (single-mode = long distance, narrow core).",
      ],
      examPoints: [
        "Classification chart: guided vs unguided with examples.",
        "Twisted pair: why wires are twisted (crosstalk reduction); UTP vs STP.",
        "Coaxial cable structure with a labelled cross-section.",
        "Optical fibre: principle (total internal reflection), advantages, single vs multimode.",
        "Unguided media: radio, microwave, infrared with frequencies and one use each.",
      ],
      summary:
        "Transmission media are guided (twisted pair, coax, fibre) or unguided (radio, microwave, infrared). Fibre offers the highest bandwidth and noise immunity; twisted pair is cheapest for short LAN runs; wireless media enable mobility. Choice depends on bandwidth, distance, environment and cost.",
    },
    simplify: {
      simpleEnglish:
        "Transmission media are the roads that data travels on. Wired media (twisted pair, coax, fibre) are like paved highways — fast, secure, fixed. Wireless media (radio, microwave, infrared) are like open air — flexible but blocked by obstacles and noisier.",
      hinglish:
        "Transmission media woh raste hain jisse data travel karta hai. Wired (twisted pair, coax, fibre) = paved highway — fast, secure, fix. Wireless (radio, microwave, infrared) = khuli hawa — flexible lekin obstacles se block aur noisy.",
      analogy:
        "Think of sending a letter. Twisted pair is a local cycle courier (cheap, short distance). Coaxial cable is a state transport bus (more capacity, more distance). Fibre is a high-speed bullet train (huge capacity, very long distance). Radio is a megaphone broadcast (everyone hears, but no physical link).",
      fiveMinute:
        "Minute 1: classification guided vs unguided. Minute 2: twisted pair + why twisted. Minute 3: coaxial structure. Minute 4: optical fibre principle + advantages. Minute 5: radio, microwave, infrared uses.",
      oneMinuteRecap:
        "Guided: twisted pair, coax, fibre. Unguided: radio, microwave, infrared. Fibre = light, highest bandwidth, immune to EMI. Twisted pair reduces crosstalk. Microwave needs line-of-sight.",
      examFormat:
        "Expect a 5-mark classification chart and a 3-mark comparison table (twisted pair vs coax vs fibre on bandwidth, distance, cost, noise immunity). Always draw the coax/fibre cross-section.",
    },
    visualise: {
      type: "diagram",
      description:
        "A two-branch tree: 'Transmission Media' splits into 'Guided' (twisted pair, coaxial, optical fibre — each with a cross-section sketch) and 'Unguided' (radio, microwave, infrared — each with a frequency range and one application).",
      steps: [
        "Top node: 'Transmission Media'.",
        "Left branch: 'Guided (Wired)' with three children.",
        "  Twisted pair: show two intertwined copper wires; label UTP/STP; frequency up to ~1 GHz.",
        "  Coaxial: cross-section showing inner conductor, dielectric, shield, jacket; frequency up to ~500 MHz.",
        "  Optical fibre: cross-section showing core, cladding, buffer; light ray reflecting by total internal reflection.",
        "Right branch: 'Unguided (Wireless)' with three children.",
        "  Radio: omnidirectional waves; 3 kHz – 1 GHz; uses: FM, Wi-Fi, cellular.",
        "  Microwave: directional waves; 1 – 300 GHz; uses: satellite, mobile backhaul.",
        "  Infrared: short-range, line-of-sight; uses: TV remote, short-range data.",
      ],
      reducedMotionAlt:
        "Render as a static two-column table with the cross-sections replaced by labelled lists.",
    },
    practise: {
      guidedExamples: [
        { question: "Which medium would you choose for a 50 km, 10 Gbps link between two college campuses?", solution: "Optical fibre — supports Gbps over tens of km and is immune to EMI." },
        { question: "Why are the two wires in a twisted pair twisted?", solution: "To reduce crosstalk and external electromagnetic interference — the twists cancel induced noise." },
      ],
      easyQuestions: [
        "Name the three types of guided media.",
        "Which medium uses light for transmission?",
        "Give one example each of radio and infrared usage.",
      ],
      mediumQuestions: [
        "Differentiate UTP and STP.",
        "Explain total internal reflection in optical fibre.",
        "Why do microwaves require line-of-sight?",
      ],
      hardQuestions: [
        "Compare twisted pair, coaxial and optical fibre on bandwidth, distance, cost and noise immunity.",
        "Distinguish single-mode and multimode fibre; which one is used for long-haul and why?",
      ],
      hints: [
        "Fibre = light, highest bandwidth, immune to EMI.",
        "Twisted pair wires are twisted to cancel noise.",
        "Microwave = directional, needs line-of-sight.",
      ],
    },
    revise: {
      shortNotes: [
        "Guided: twisted pair, coaxial, optical fibre.",
        "Unguided: radio, microwave, infrared.",
        "Twisted pair reduces crosstalk; UTP vs STP.",
        "Optical fibre uses total internal reflection; immune to EMI.",
        "Single-mode fibre = long haul; multimode = short distance.",
        "Microwave = directional, line-of-sight; radio = omnidirectional.",
      ],
      definitions: [
        { term: "Transmission Medium", definition: "The physical path through which data signals travel from sender to receiver." },
        { term: "Twisted Pair", definition: "Two insulated copper wires twisted together to reduce crosstalk." },
        { term: "Optical Fibre", definition: "A glass strand that carries light pulses using total internal reflection." },
      ],
      formulas: [],
      flashcards: [
        { front: "Light-based medium?", back: "Optical fibre." },
        { front: "Why twist the wires?", back: "To reduce crosstalk and EMI." },
        { front: "Microwave requires what?", back: "Line-of-sight." },
      ],
      commonConfusions: [
        { a: "STP", b: "UTP", difference: "STP has an additional metal shield around the pairs for extra noise immunity; UTP does not and is cheaper." },
        { a: "Single-mode", b: "Multimode fibre", difference: "Single-mode has a narrow core (~8 µm) for long-distance laser transmission; multimode has a wider core (~50 µm) for short-distance LED transmission." },
      ],
    },
  },

  // ==========================================================================
  // DC — osi-model
  // ==========================================================================
  {
    subjectCode: "CS204",
    topicSlug: "osi-model",
    title: "OSI Model",
    order: 13,
    durationMin: 16,
    learn: {
      definition:
        "The OSI (Open Systems Interconnection) model is a seven-layer conceptual framework developed by ISO that standardises the functions of a communication system. Each layer performs a specific sub-task of data communication and serves the layer above it.",
      purpose:
        "OSI gives vendors and engineers a common vocabulary so that different systems can interoperate. It also helps in troubleshooting — a problem can be isolated to a particular layer. Though not implemented exactly as defined, it remains the reference for understanding networks.",
      prerequisites: ["Components of data communication", "Topologies", "Basic signals"],
      coreConcepts: [
        { title: "Layer 1 — Physical", explanation: "Transmits raw bits over a physical medium. Defines voltage levels, connector pins, cable specs, encoding. Hubs and repeaters operate here. PDU: Bit." },
        { title: "Layer 2 — Data Link", explanation: "Node-to-node delivery over the same medium. Frames data, detects/corrects errors (CRC), controls media access (MAC). Switches and bridges operate here. PDU: Frame." },
        { title: "Layer 3 — Network", explanation: "Routes packets across multiple networks. Logical addressing (IP), routing, congestion control. Routers operate here. PDU: Packet." },
        { title: "Layer 4 — Transport", explanation: "End-to-end reliable (or unreliable) delivery. Segmentation, flow control, error recovery. TCP (reliable) and UDP (fast, unreliable). PDU: Segment (TCP) / Datagram (UDP)." },
        { title: "Layer 5 — Session", explanation: "Establishes, manages and terminates sessions between applications. Synchronisation points, dialog control (half-duplex/full-duplex)." },
        { title: "Layer 6 — Presentation", explanation: "Translation, encryption, compression. Ensures data sent by the application layer of one system is readable by the application layer of another (e.g. ASCII ↔ EBCDIC, SSL/TLS)." },
        { title: "Layer 7 — Application", explanation: "Closest to the user. Provides network services to applications: HTTP, FTP, SMTP, DNS, etc." },
      ],
      stepByStep: [
        "Sender: data starts at L7 (Application).",
        "Each layer adds its own header (encapsulation) as data moves down.",
        "At L1, bits are transmitted over the physical medium.",
        "Receiver: bits arrive at L1, each layer strips its header as data moves up.",
        "Finally the original data reaches the receiver's L7.",
      ],
      examples: [
        { title: "Sending an email", content: "L7 SMTP → L6 encryption (TLS) → L5 session → L4 TCP segment → L3 IP packet → L2 Ethernet frame → L1 electrical signals on the wire." },
        { title: "PDU mnemonic", content: "L1=Bits, L2=Frames, L3=Packets, L4=Segments — 'Big Fat Packet Sandwich'." },
      ],
      commonErrors: [
        "Confusing OSI (7 layers) with TCP/IP (4 layers).",
        "Putting routers at L2 — routers are L3 (Network); switches are L2.",
        "Mixing up the order of layers — memorise 'All People Seem To Need Data Processing' (A-P-S-T-N-D-P).",
        "Forgetting that the Presentation layer handles encryption and compression.",
      ],
      examPoints: [
        "List the seven layers in order with one function each.",
        "PDU at each of the lower four layers.",
        "Devices operating at L1, L2, L3 (hub, switch, router).",
        "Encapsulation concept: header added at each layer on send, removed on receive.",
        "Difference between OSI and TCP/IP (number of layers, real adoption).",
      ],
      summary:
        "The OSI model has seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Each performs one sub-task and serves the layer above. PDUs are Bit, Frame, Packet, Segment for L1–L4. Hubs at L1, switches at L2, routers at L3. Encapsulation adds headers down; decapsulation removes them up.",
    },
    simplify: {
      simpleEnglish:
        "Imagine sending a letter through a postal service. You (Application) write the letter. The clerk (Presentation) translates it. A manager (Session) opens a conversation with the destination. The dispatcher (Transport) cuts the letter into smaller envelopes and numbers them. The sorting office (Network) puts addresses on each. The local postman (Data Link) delivers between post offices. The actual vehicle (Physical) carries the envelopes. Seven jobs, seven layers.",
      hinglish:
        "Letter bhejne ke 7 kaam hain — application likhti hai, presentation translate karti hai, session conversation kholi, transport chhote envelopes mein baant-ti hai, network address lagati hai, data link local delivery karti hai, physical actual wire pe bhejti hai. Saat kaam, saat layers.",
      analogy:
        "Ordering pizza online. App = L7, payment encryption = L6, your session with the app = L5, the order being split into items + tracked = L4, routing the rider across the city = L3, the rider moving on a street = L2, the rider's bike wheels on the road = L1.",
      fiveMinute:
        "Minute 1: definition + why layered. Minute 2-3: list layers top to bottom with one function each. Minute 4: PDU at L1-L4 + devices. Minute 5: encapsulation diagram and OSI vs TCP/IP in one line.",
      oneMinuteRecap:
        "7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. PDUs: Bit, Frame, Packet, Segment. Devices: hub L1, switch L2, router L3. Mnemonic: All People Seem To Need Data Processing.",
      examFormat:
        "Expect a 5-mark question listing the seven layers with one function each, a 3-mark question on devices/PDUs, and a 2-mark OSI vs TCP/IP comparison. Draw a vertical stack with arrows showing encapsulation.",
    },
    visualise: {
      type: "diagram",
      description:
        "Two vertical stacks of seven coloured boxes facing each other — sender (left) and receiver (right). Each box is labelled with its layer name and PDU. Down-arrows on the left show encapsulation (header added at each layer); up-arrows on the right show decapsulation. The bottom layers are joined by a 'Physical medium' bar.",
      steps: [
        "Draw two vertical columns of seven coloured boxes, mirror images.",
        "Top to bottom label: Application, Presentation, Session, Transport, Network, Data Link, Physical.",
        "On the sender side draw red down-arrows labelled '+H7', '+H6', ..., '+H1' showing encapsulation.",
        "On the receiver side draw green up-arrows labelled '−H1', '−H2', ..., '−H7' showing decapsulation.",
        "Join the bottom two Physical layers with a horizontal bar labelled 'Physical Medium'.",
        "Add PDU tags on the right: Bits, Frame, Packet, Segment, Data, Data, Data.",
      ],
      reducedMotionAlt:
        "Show a static numbered table: Layer No., Name, PDU, Device, Function — with the encapsulation flow described in a caption.",
    },
    practise: {
      guidedExamples: [
        { question: "Which OSI layer is responsible for routing?", solution: "Layer 3 (Network). Routers operate here and use IP addresses." },
        { question: "At which layer does encryption happen?", solution: "Layer 6 (Presentation) — translates, encrypts and compresses data." },
      ],
      easyQuestions: [
        "How many layers does the OSI model have?",
        "Which layer transmits raw bits?",
        "Name the PDU at the Network layer.",
      ],
      mediumQuestions: [
        "List the seven OSI layers in order with one function each.",
        "Which devices operate at L1, L2 and L3?",
        "What is encapsulation? Describe it briefly.",
      ],
      hardQuestions: [
        "Differentiate the OSI and TCP/IP models in five points.",
        "Explain how an email sent via SMTP travels through all seven layers at the sender side.",
      ],
      hints: [
        "Mnemonic: 'All People Seem To Need Data Processing'.",
        "L1=Bits, L2=Frames, L3=Packets, L4=Segments.",
        "Hub L1, Switch L2, Router L3.",
      ],
    },
    revise: {
      shortNotes: [
        "7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
        "PDUs: L1 Bit, L2 Frame, L3 Packet, L4 Segment.",
        "Devices: hub L1, switch L2, router L3.",
        "Encryption & compression at L6 (Presentation).",
        "Routing & IP at L3; reliable delivery at L4 (TCP).",
        "Mnemonic: All People Seem To Need Data Processing.",
      ],
      definitions: [
        { term: "OSI Model", definition: "A seven-layer ISO reference framework standardising communication functions." },
        { term: "Encapsulation", definition: "Adding a header (and sometimes trailer) at each layer as data moves down the sender stack." },
        { term: "PDU", definition: "Protocol Data Unit — the name of the data block at a given layer (bit, frame, packet, segment)." },
      ],
      formulas: [],
      flashcards: [
        { front: "How many OSI layers?", back: "Seven." },
        { front: "Routing happens at which layer?", back: "Layer 3 — Network." },
        { front: "Switch operates at which layer?", back: "Layer 2 — Data Link." },
      ],
      commonConfusions: [
        { a: "OSI", b: "TCP/IP", difference: "OSI has 7 layers and is a reference model; TCP/IP has 4 layers and is the model the real internet uses." },
        { a: "Switch", b: "Router", difference: "Switch operates at L2 (Data Link) using MAC addresses; router operates at L3 (Network) using IP addresses." },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// QUESTIONS (40+ MCQs across all 4 subjects)
// ---------------------------------------------------------------------------
interface QuestionSeed {
  subjectCode: string;
  unitNumber: number;
  topicSlug: string;
  type: "mcq";
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
  hint: string;
  marks: 1 | 2;
  source?: string;
  year?: number;
}

const QUESTIONS: QuestionSeed[] = [
  // ============= DATA STRUCTURES (CS201) — 13 questions =============
  {
    subjectCode: "CS201", unitNumber: 1, topicSlug: "data-structures-overview",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which of the following is a non-linear data structure?",
    options: ["Array", "Stack", "Tree", "Queue"],
    correctAnswer: 2,
    explanation: "A tree arranges elements hierarchically (parent-child), so it is non-linear. Arrays, stacks and queues are linear.",
    hint: "Think hierarchical vs sequential.",
  },
  {
    subjectCode: "CS201", unitNumber: 1, topicSlug: "data-structures-overview",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "A data structure whose size is fixed at compile time is called:",
    options: ["Dynamic", "Static", "Linked", "Hierarchical"],
    correctAnswer: 1,
    explanation: "Static data structures (like arrays) have a size fixed at compile time. Dynamic ones (like linked lists) grow/shrink at runtime.",
    hint: "Arrays are the classic example.",
  },
  {
    subjectCode: "CS201", unitNumber: 1, topicSlug: "asymptotic-notation",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Big-O notation describes which case of an algorithm?",
    options: ["Best case", "Average case", "Worst case (upper bound)", "Exact case"],
    correctAnswer: 2,
    explanation: "Big-O gives an asymptotic upper bound — i.e. the worst-case growth rate of an algorithm.",
    hint: "Upper bound = worst case.",
  },
  {
    subjectCode: "CS201", unitNumber: 1, topicSlug: "asymptotic-notation",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "Which of the following growth rates is the smallest (fastest)?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(n log n)"],
    correctAnswer: 1,
    explanation: "Order from fastest to slowest: O(1) < O(log n) < O(n) < O(n log n) < O(n²). So O(log n) is the smallest of these.",
    hint: "Halving gives logarithmic growth.",
  },
  {
    subjectCode: "CS201", unitNumber: 1, topicSlug: "time-space-complexity",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "What is the time complexity of the code: for(i=1;i<n;i*=2) sum++;?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"],
    correctAnswer: 2,
    explanation: "i doubles each iteration (1,2,4,8,...). It reaches n after log₂n iterations, so the loop runs O(log n) times.",
    hint: "i is multiplied, not added.",
  },
  {
    subjectCode: "CS201", unitNumber: 2, topicSlug: "binary-search",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Binary search can be applied on an array that is:",
    options: ["Unsorted", "Sorted", "Reverse-sorted only", "Any array"],
    correctAnswer: 1,
    explanation: "Binary search works by repeatedly halving a sorted range — it requires the array to be sorted.",
    hint: "It compares against the middle element.",
  },
  {
    subjectCode: "CS201", unitNumber: 2, topicSlug: "binary-search",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "What is the time complexity of binary search on a sorted array of n elements?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    correctAnswer: 2,
    explanation: "Each comparison halves the search range, giving log₂n comparisons — O(log n).",
    hint: "Halving → logarithmic.",
  },
  {
    subjectCode: "CS201", unitNumber: 2, topicSlug: "linear-search",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "The worst-case time complexity of linear search is:",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correctAnswer: 2,
    explanation: "Linear search scans every element in the worst case, so its complexity is O(n).",
    hint: "Worst case: element not present.",
  },
  {
    subjectCode: "CS201", unitNumber: 3, topicSlug: "bubble-sort",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "What is the worst-case time complexity of bubble sort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: 2,
    explanation: "Bubble sort uses two nested loops, each O(n), giving O(n²) comparisons and swaps in the worst case.",
    hint: "Two nested loops over n.",
  },
  {
    subjectCode: "CS201", unitNumber: 3, topicSlug: "bubble-sort",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "With the early-exit (swap flag) optimisation, what is the best-case time complexity of bubble sort?",
    options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"],
    correctAnswer: 1,
    explanation: "If the array is already sorted, one pass with zero swaps triggers the early exit, giving O(n) best case.",
    hint: "Already sorted → no swaps → stop early.",
  },
  {
    subjectCode: "CS201", unitNumber: 3, topicSlug: "merge-and-quick-sort",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "Which of the following sorting algorithms has an average time complexity of O(n log n)?",
    options: ["Bubble sort", "Selection sort", "Insertion sort", "Merge sort"],
    correctAnswer: 3,
    explanation: "Merge sort is a divide-and-conquer algorithm with O(n log n) complexity in all cases. The other three are O(n²) on average.",
    hint: "Divide-and-conquer gives n log n.",
  },
  {
    subjectCode: "CS201", unitNumber: 4, topicSlug: "stack-basics",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "A stack follows which ordering principle?",
    options: ["FIFO", "LIFO", "Priority", "Random"],
    correctAnswer: 1,
    explanation: "A stack follows Last-In-First-Out (LIFO) — the most recently pushed element is the first one popped.",
    hint: "Think of a stack of plates.",
  },
  {
    subjectCode: "CS201", unitNumber: 4, topicSlug: "stack-basics",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "In an array-based stack, what is the initial value of the 'top' variable?",
    options: ["0", "1", "-1", "n"],
    correctAnswer: 2,
    explanation: "top starts at -1 to indicate an empty stack. The first push increments it to 0 and stores the element at index 0.",
    hint: "It must signal 'empty' before any push.",
  },
  {
    subjectCode: "CS201", unitNumber: 4, topicSlug: "queue-basics",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "A queue follows which ordering principle?",
    options: ["LIFO", "FIFO", "Random", "Priority only"],
    correctAnswer: 1,
    explanation: "A queue follows First-In-First-Out (FIFO) — the element that entered first leaves first, like a ticket counter line.",
    hint: "Ticket counter line.",
  },
  {
    subjectCode: "CS201", unitNumber: 5, topicSlug: "singly-linked-list",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Each node of a singly linked list contains:",
    options: ["Only data", "Data and a pointer to the next node", "Two pointers", "An array"],
    correctAnswer: 1,
    explanation: "A singly linked list node holds the data and a single 'next' pointer to the next node. The last node's next is NULL.",
    hint: "Single link → one pointer.",
  },
  {
    subjectCode: "CS201", unitNumber: 5, topicSlug: "singly-linked-list",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "What is the time complexity of inserting a node at the head of a singly linked list?",
    options: ["O(n)", "O(1)", "O(log n)", "O(n²)"],
    correctAnswer: 1,
    explanation: "Head insertion only requires creating a node, pointing its next to the current head, and updating head — constant time, O(1).",
    hint: "No traversal needed.",
  },
  {
    subjectCode: "CS201", unitNumber: 6, topicSlug: "bst-basics",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "In a Binary Search Tree, an inorder traversal produces elements in which order?",
    options: ["Random", "Reverse sorted", "Sorted ascending", "Heap order"],
    correctAnswer: 2,
    explanation: "Inorder traversal of a BST visits Left, Root, Right — which yields elements in ascending sorted order.",
    hint: "Left ≤ Root ≤ Right.",
  },

  // ============= OOP WITH C++ (CS202) — 12 questions =============
  {
    subjectCode: "CS202", unitNumber: 1, topicSlug: "oop-paradigm",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which of the following is NOT one of the four pillars of OOP?",
    options: ["Encapsulation", "Inheritance", "Compilation", "Polymorphism"],
    correctAnswer: 2,
    explanation: "The four pillars are Encapsulation, Inheritance, Polymorphism and Abstraction. Compilation is a translation step, not an OOP pillar.",
    hint: "The fourth pillar is Abstraction.",
  },
  {
    subjectCode: "CS202", unitNumber: 1, topicSlug: "oop-paradigm",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Wrapping data and the functions that act on it into a single unit is called:",
    options: ["Inheritance", "Encapsulation", "Polymorphism", "Abstraction"],
    correctAnswer: 1,
    explanation: "Encapsulation bundles data and methods into a class with controlled access via public/private specifiers.",
    hint: "Think of a capsule.",
  },
  {
    subjectCode: "CS202", unitNumber: 2, topicSlug: "classes-objects-basics",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "The default access specifier inside a C++ 'class' is:",
    options: ["public", "private", "protected", "friend"],
    correctAnswer: 1,
    explanation: "Members of a 'class' are private by default. Members of a 'struct' are public by default.",
    hint: "Struct is the opposite.",
  },
  {
    subjectCode: "CS202", unitNumber: 2, topicSlug: "classes-objects-basics",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "An object is best described as:",
    options: ["A blueprint", "An instance of a class", "A function name", "A header file"],
    correctAnswer: 1,
    explanation: "A class is the blueprint; an object is a concrete instance of that class with its own data values in memory.",
    hint: "Class = design, ? = house.",
  },
  {
    subjectCode: "CS202", unitNumber: 3, topicSlug: "constructors",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "A constructor in C++ is invoked:",
    options: ["Manually using the dot operator", "Automatically when an object is created", "Only at program exit", "When an object is destroyed"],
    correctAnswer: 1,
    explanation: "A constructor runs automatically when an object is created, initialising its members. Destructors run when the object is destroyed.",
    hint: "It 'constructs' the object at birth.",
  },
  {
    subjectCode: "CS202", unitNumber: 3, topicSlug: "constructors",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Which constructor is invoked when an object is initialised with another object of the same class?",
    options: ["Default constructor", "Parameterised constructor", "Copy constructor", "Destructor"],
    correctAnswer: 2,
    explanation: "The copy constructor initialises an object from another existing object of the same class (e.g. Student s2 = s1;).",
    hint: "Copying one object into another.",
  },
  {
    subjectCode: "CS202", unitNumber: 3, topicSlug: "operator-overloading",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Which of the following operators CANNOT be overloaded in C++?",
    options: ["+", "==", "::", "[]"],
    correctAnswer: 2,
    explanation: "The scope resolution operator (::), sizeof, member access (.), and ternary (?:) operators cannot be overloaded in C++.",
    hint: "Five operators can't be overloaded; :: is one.",
  },
  {
    subjectCode: "CS202", unitNumber: 3, topicSlug: "operator-overloading",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "Operator overloading lets us:",
    options: ["Create new operators", "Define how existing operators work on user-defined types", "Change operator precedence", "Use operators only on int"],
    correctAnswer: 1,
    explanation: "Operator overloading gives existing operators (like +, ==, []) new meaning when applied to user-defined types like classes. New operators cannot be created.",
    hint: "Existing operators, new types.",
  },
  {
    subjectCode: "CS202", unitNumber: 4, topicSlug: "inheritance-basics",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Inheritance in C++ implements which relationship?",
    options: ["Has-a", "Is-a", "Uses-a", "Knows-a"],
    correctAnswer: 1,
    explanation: "Inheritance models the 'is-a' relationship: a Dog is an Animal. Composition models 'has-a' (a Car has an Engine).",
    hint: "Dog ___ an Animal.",
  },
  {
    subjectCode: "CS202", unitNumber: 4, topicSlug: "inheritance-basics",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "When a derived class object is created, which constructor runs first?",
    options: ["Derived class constructor", "Base class constructor", "Both run simultaneously", "No constructor runs"],
    correctAnswer: 1,
    explanation: "The base class constructor runs first to initialise inherited members, then the derived constructor initialises its own members. Destructors run in reverse order.",
    hint: "Build the foundation first.",
  },
  {
    subjectCode: "CS202", unitNumber: 4, topicSlug: "virtual-functions",
    type: "mcq", difficulty: "hard", marks: 2,
    question: "A pure virtual function is declared by suffixing its declaration with:",
    options: ["= 0", "= NULL", "virtual", "abstract"],
    correctAnswer: 0,
    explanation: "A pure virtual function is declared as virtual void draw() = 0; — the '= 0' makes it pure, forcing the class to be abstract.",
    hint: "Two characters: equals and zero.",
  },
  {
    subjectCode: "CS202", unitNumber: 5, topicSlug: "templates",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "Templates in C++ are used for:",
    options: ["Generic programming", "Memory allocation", "File I/O", "Exception handling"],
    correctAnswer: 0,
    explanation: "Templates enable generic programming — writing a single function or class that works with any data type. e.g. template<typename T> T max(T a, T b);",
    hint: "Write once, use for any type.",
  },

  // ============= MICROPROCESSORS (CS203) — 12 questions =============
  {
    subjectCode: "CS203", unitNumber: 1, topicSlug: "8086-registers",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "The 8086 microprocessor has how many registers (in total)?",
    options: ["8", "10", "14", "16"],
    correctAnswer: 2,
    explanation: "The 8086 has 14 registers: 4 general-purpose (AX, BX, CX, DX), 4 pointer/index (SP, BP, SI, DI), 4 segment (CS, DS, SS, ES), plus IP and FLAGS.",
    hint: "4+4+4+1+1.",
  },
  {
    subjectCode: "CS203", unitNumber: 1, topicSlug: "8086-registers",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which register is used as the loop counter by the LOOP instruction?",
    options: ["AX", "BX", "CX", "DX"],
    correctAnswer: 2,
    explanation: "The LOOP instruction automatically decrements CX and jumps back if CX ≠ 0. So CX is the natural loop counter.",
    hint: "C for Counter.",
  },
  {
    subjectCode: "CS203", unitNumber: 1, topicSlug: "8086-registers",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "The two 8-bit halves of the BX register are:",
    options: ["BH and BL", "AH and AL", "CH and CL", "DH and DL"],
    correctAnswer: 0,
    explanation: "Each 16-bit general register splits into High and Low 8-bit halves. BX → BH (high byte) and BL (low byte).",
    hint: "H = high, L = low; B for BX.",
  },
  {
    subjectCode: "CS203", unitNumber: 1, topicSlug: "memory-segmentation",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "If CS = 0x1000 and IP = 0x0200, what is the physical address?",
    options: ["0x10200", "0x12000", "0x10020", "0x02100"],
    correctAnswer: 0,
    explanation: "Physical address = (CS × 16) + IP = (0x1000 × 0x10) + 0x0200 = 0x10000 + 0x0200 = 0x10200.",
    hint: "Segment shifted left by 4 bits, then add offset.",
  },
  {
    subjectCode: "CS203", unitNumber: 2, topicSlug: "addressing-modes",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "In the instruction 'MOV AX, 5', the addressing mode is:",
    options: ["Register", "Immediate", "Direct", "Indexed"],
    correctAnswer: 1,
    explanation: "The operand 5 is a constant embedded directly in the instruction — this is immediate addressing.",
    hint: "The data is right there in the instruction.",
  },
  {
    subjectCode: "CS203", unitNumber: 2, topicSlug: "addressing-modes",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Which addressing mode does 'MOV AX, [BP+4]' use?",
    options: ["Register indirect", "Based", "Indexed", "Immediate"],
    correctAnswer: 1,
    explanation: "BP with a displacement uses Based addressing. It defaults to the SS segment, which is why it's used for stack parameters.",
    hint: "BP = base register.",
  },
  {
    subjectCode: "CS203", unitNumber: 2, topicSlug: "data-transfer-instructions",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which instruction pushes the contents of AX onto the stack?",
    options: ["POP AX", "PUSH AX", "MOV AX, SP", "XCHG AX, SP"],
    correctAnswer: 1,
    explanation: "PUSH AX decrements SP by 2 and stores AX at SS:SP — pushing onto the stack. POP AX does the reverse.",
    hint: "Pushing = adding to the top.",
  },
  {
    subjectCode: "CS203", unitNumber: 2, topicSlug: "branching-loop-instructions",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "The LOOP instruction decrements which register and jumps if it is non-zero?",
    options: ["AX", "BX", "CX", "DX"],
    correctAnswer: 2,
    explanation: "LOOP decrements CX by 1 and jumps to the target label if CX ≠ 0. This makes CX the natural loop counter.",
    hint: "Same register used for counting.",
  },
  {
    subjectCode: "CS203", unitNumber: 3, topicSlug: "simple-programs",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Which directive reserves an uninitialized byte-sized variable in the data segment?",
    options: ["DB", "DW", "?", "DD"],
    correctAnswer: 0,
    explanation: "DB (Define Byte) allocates byte storage. e.g. 'num DB ?' reserves one uninitialized byte. DW is for words (2 bytes).",
    hint: "B = byte.",
  },
  {
    subjectCode: "CS203", unitNumber: 4, topicSlug: "io-interfacing",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "The 8255 is a:",
    options: ["Programmable Interrupt Controller", "Programmable Peripheral Interface", "Programmable Interval Timer", "DMA Controller"],
    correctAnswer: 1,
    explanation: "The 8255 PPI (Programmable Peripheral Interface) provides three 8-bit I/O ports (A, B, C) for general-purpose digital I/O. The 8259 is the PIC.",
    hint: "PPI = Peripheral Interface.",
  },
  {
    subjectCode: "CS203", unitNumber: 5, topicSlug: "interrupts",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "In the 8086, the Interrupt Vector Table (IVT) is located at memory address:",
    options: ["0x00000 – 0x003FF", "0xFFFFF – 0xF0000", "0x80000 – 0x803FF", "0x10000 – 0x103FF"],
    correctAnswer: 0,
    explanation: "The IVT occupies the first 1 KB of memory (00000H – 003FFH), holding 256 4-byte interrupt vectors.",
    hint: "Very start of memory, 1 KB long.",
  },
  {
    subjectCode: "CS203", unitNumber: 5, topicSlug: "interrupts",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which pin on the 8086 is a non-maskable hardware interrupt?",
    options: ["INTR", "NMI", "INTA", "RESET"],
    correctAnswer: 1,
    explanation: "NMI (Non-Maskable Interrupt) cannot be disabled by software and is always serviced. INTR can be masked using the IF flag.",
    hint: "Non-Maskable Interrupt.",
  },

  // ============= DATA COMMUNICATION (CS204) — 12 questions =============
  {
    subjectCode: "CS204", unitNumber: 1, topicSlug: "dc-components",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "In which transmission mode can data flow in both directions simultaneously?",
    options: ["Simplex", "Half-duplex", "Full-duplex", "Unicast"],
    correctAnswer: 2,
    explanation: "In full-duplex mode, both stations can transmit and receive simultaneously (e.g. a telephone call). Half-duplex allows both directions but one at a time; simplex is one-way only.",
    hint: "Like a phone call vs a walkie-talkie.",
  },
  {
    subjectCode: "CS204", unitNumber: 1, topicSlug: "dc-components",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "A radio/TV broadcast is an example of which transmission mode?",
    options: ["Simplex", "Half-duplex", "Full-duplex", "Multicast"],
    correctAnswer: 0,
    explanation: "A broadcast is one-way only — the sender transmits and receivers only listen. This is simplex mode.",
    hint: "One-way only.",
  },
  {
    subjectCode: "CS204", unitNumber: 1, topicSlug: "network-topologies",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which topology uses a single central hub and a separate cable to each device?",
    options: ["Bus", "Ring", "Star", "Mesh"],
    correctAnswer: 2,
    explanation: "In a star topology, every device connects to a central hub/switch with its own cable. Failure of one device doesn't affect others, but hub failure brings down the whole network.",
    hint: "Central hub, radiating spokes.",
  },
  {
    subjectCode: "CS204", unitNumber: 2, topicSlug: "transmission-media",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "Which of the following is a guided transmission medium?",
    options: ["Radio wave", "Microwave", "Optical fibre", "Infrared"],
    correctAnswer: 2,
    explanation: "Optical fibre is a guided (wired) medium — the light signal is confined within the fibre. Radio, microwave and infrared are unguided (wireless).",
    hint: "Wired = guided.",
  },
  {
    subjectCode: "CS204", unitNumber: 2, topicSlug: "transmission-media",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Optical fibre communication uses the principle of:",
    options: ["Reflection", "Total internal reflection", "Refraction", "Diffraction"],
    correctAnswer: 1,
    explanation: "Light in an optical fibre is guided by total internal reflection at the core-cladding boundary, allowing it to travel long distances with low loss.",
    hint: "Light bounces back entirely into the core.",
  },
  {
    subjectCode: "CS204", unitNumber: 2, topicSlug: "transmission-media",
    type: "mcq", difficulty: "medium", marks: 1,
    question: "Why are the two wires in a twisted pair twisted around each other?",
    options: ["To save space", "To increase strength", "To reduce crosstalk and EMI", "To increase resistance"],
    correctAnswer: 2,
    explanation: "Twisting the two wires cancels out induced noise and reduces crosstalk between adjacent pairs — both wires pick up the same noise, which then cancels at the receiver.",
    hint: "Cancellation of noise.",
  },
  {
    subjectCode: "CS204", unitNumber: 3, topicSlug: "analog-modulation",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "In Amplitude Modulation (AM), which property of the carrier is varied?",
    options: ["Frequency", "Amplitude", "Phase", "Pulse width"],
    correctAnswer: 1,
    explanation: "In AM, the amplitude of the carrier is varied in proportion to the message signal, while frequency and phase remain constant.",
    hint: "It's in the name.",
  },
  {
    subjectCode: "CS204", unitNumber: 3, topicSlug: "digital-modulation",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "In which digital modulation technique does the carrier's phase shift between two values to represent 0 and 1?",
    options: ["ASK", "FSK", "PSK", "PAM"],
    correctAnswer: 2,
    explanation: "In Phase Shift Keying (PSK), the phase of the carrier is shifted between two (or more) values to represent digital data. ASK varies amplitude; FSK varies frequency.",
    hint: "Phase changes.",
  },
  {
    subjectCode: "CS204", unitNumber: 4, topicSlug: "multiplexing",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "TDM (Time Division Multiplexing) shares the channel by:",
    options: ["Dividing frequency into bands", "Dividing time into slots", "Using separate wires", "Modulating phases"],
    correctAnswer: 1,
    explanation: "In TDM, each source gets the entire bandwidth but only for a fixed time slot in rotation. FDM divides frequency into bands; WDM uses wavelength.",
    hint: "Time is sliced.",
  },
  {
    subjectCode: "CS204", unitNumber: 4, topicSlug: "switching",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "Which switching technique establishes a dedicated path before data is sent?",
    options: ["Packet switching", "Message switching", "Circuit switching", "Virtual circuit"],
    correctAnswer: 2,
    explanation: "Circuit switching (used in traditional telephone networks) establishes a dedicated end-to-end path before any data is sent. Packet switching sends data as independent packets with no prior path.",
    hint: "Like a phone call.",
  },
  {
    subjectCode: "CS204", unitNumber: 5, topicSlug: "osi-model",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "How many layers does the OSI model have?",
    options: ["4", "5", "7", "9"],
    correctAnswer: 2,
    explanation: "The OSI model has seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
    hint: "Memorise the seven.",
  },
  {
    subjectCode: "CS204", unitNumber: 5, topicSlug: "osi-model",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "At which OSI layer does a router operate?",
    options: ["Layer 1 (Physical)", "Layer 2 (Data Link)", "Layer 3 (Network)", "Layer 4 (Transport)"],
    correctAnswer: 2,
    explanation: "Routers operate at Layer 3 (Network) — they make forwarding decisions based on IP addresses. Switches operate at L2, hubs at L1.",
    hint: "Routers use IP addresses.",
  },
  {
    subjectCode: "CS204", unitNumber: 5, topicSlug: "osi-model",
    type: "mcq", difficulty: "medium", marks: 2,
    question: "At which OSI layer is encryption performed?",
    options: ["Application", "Presentation", "Session", "Transport"],
    correctAnswer: 1,
    explanation: "The Presentation layer (L6) handles translation, encryption and compression so data from the application layer is in a standard form for transmission.",
    hint: "Translate, encrypt, compress.",
  },
  {
    subjectCode: "CS204", unitNumber: 5, topicSlug: "tcp-ip-model",
    type: "mcq", difficulty: "easy", marks: 1,
    question: "How many layers does the TCP/IP model have?",
    options: ["4", "5", "7", "3"],
    correctAnswer: 0,
    explanation: "The TCP/IP model has four layers: Link (Network Access), Internet, Transport, and Application. (Some texts use a 5-layer hybrid.)",
    hint: "Fewer than OSI.",
  },
];

// ---------------------------------------------------------------------------
// ACHIEVEMENTS (12)
// ---------------------------------------------------------------------------
const ACHIEVEMENTS: { key: string; name: string; description: string; icon: string; category: string; xpReward: number; criteria?: any }[] = [
  { key: "first_lesson", name: "First Step", description: "Complete your very first lesson on Lernio AI.", icon: "Footprints", category: "learning", xpReward: 50, criteria: { lessonsCompleted: 1 } },
  { key: "streak_3", name: "Hat-trick", description: "Maintain a 3-day learning streak.", icon: "Flame", category: "consistency", xpReward: 75, criteria: { streak: 3 } },
  { key: "streak_7", name: "Week Warrior", description: "Maintain a 7-day learning streak.", icon: "Flame", category: "consistency", xpReward: 150, criteria: { streak: 7 } },
  { key: "quiz_master", name: "Quiz Master", description: "Score 90%+ in 5 quizzes.", icon: "Trophy", category: "practice", xpReward: 200, criteria: { quizzesAbove90: 5 } },
  { key: "revision_pro", name: "Revision Pro", description: "Complete 25 spaced-repetition reviews.", icon: "Repeat", category: "revision", xpReward: 150, criteria: { revisionAttempts: 25 } },
  { key: "coder_first", name: "Coder First", description: "Submit your first working C++ program in the Coding Lab.", icon: "Code2", category: "coding", xpReward: 100, criteria: { codingSubmissionsPassed: 1 } },
  { key: "mock_exam", name: "Mock Master", description: "Complete your first full mock exam.", icon: "GraduationCap", category: "practice", xpReward: 200, criteria: { mockExamsCompleted: 1 } },
  { key: "contribution", name: "Contributor", description: "Have your first community contribution approved.", icon: "Users", category: "contribution", xpReward: 100, criteria: { contributionsApproved: 1 } },
  { key: "topic_master", name: "Topic Master", description: "Reach 'mastered' state on any topic.", icon: "Brain", category: "learning", xpReward: 150, criteria: { topicsMastered: 1 } },
  { key: "week_complete", name: "Week Complete", description: "Finish all tasks in your study plan for a week.", icon: "CalendarCheck", category: "consistency", xpReward: 175, criteria: { weeklyTasksCompleted: 1 } },
  { key: "early_bird", name: "Early Bird", description: "Study between 5 AM and 8 AM, five times.", icon: "Sunrise", category: "consistency", xpReward: 100, criteria: { earlyBirdSessions: 5 } },
  { key: "night_owl", name: "Night Owl", description: "Study between 9 PM and midnight, five times.", icon: "Moon", category: "consistency", xpReward: 100, criteria: { nightOwlSessions: 5 } },
];

// ---------------------------------------------------------------------------
// DEMO USER
// ---------------------------------------------------------------------------
const DEMO_USER = {
  email: "student@lernio.ai",
  name: "Aarati Sharma",
  role: "student",
  preferredLang: "en",
  xp: 450,
  level: 3,
  streak: 5,
  onboarded: true,
  semesterNumber: 3,
  dailyMins: 120,
  lastActiveDate: new Date().toISOString().slice(0, 10),
};

const ADMIN_EMAIL = (process.env.LERNIO_ADMIN_EMAIL || "ultimatebracegaming@gmail.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD =
  process.env.LERNIO_ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "admin12345");

// ---------------------------------------------------------------------------
// RESOURCES (6-8)
// ---------------------------------------------------------------------------
interface ResourceSeed {
  subjectCode: string;
  unitNumber?: number;
  title: string;
  type: string; // pdf | question_paper | lab_manual | model_answer | web_link
  url?: string;
  source: string;
  visibility?: string;
  verified?: boolean;
  year?: number;
  language?: string;
}

const RESOURCES: ResourceSeed[] = [
  { subjectCode: "CS201", title: "Data Structures — Complete Unit Notes (Units 1–6)", type: "pdf", url: "/resources/cs201-ds-notes.pdf", source: "platform", verified: true, year: 2023, language: "en" },
  { subjectCode: "CS201", title: "DS Previous Year Question Paper — Winter 2022", type: "question_paper", url: "/resources/cs201-w2022-qp.pdf", source: "teacher", verified: true, year: 2022, language: "en" },
  { subjectCode: "CS202", title: "OOP with C++ — Lab Manual with 25 Programs", type: "lab_manual", url: "/resources/cs202-oop-lab-manual.pdf", source: "platform", verified: true, year: 2023, language: "en" },
  { subjectCode: "CS202", unitNumber: 4, title: "Inheritance & Polymorphism — Model Answers", type: "model_answer", url: "/resources/cs202-u4-model-answers.pdf", source: "teacher", verified: true, year: 2023, language: "en" },
  { subjectCode: "CS203", title: "8086 Instruction Set — Quick Reference Card", type: "pdf", url: "/resources/cs203-8086-instruction-set.pdf", source: "platform", verified: true, year: 2023, language: "en" },
  { subjectCode: "CS203", title: "MP Summer 2023 Question Paper with Analysis", type: "question_paper", url: "/resources/cs203-s2023-qp.pdf", source: "teacher", verified: true, year: 2023, language: "en" },
  { subjectCode: "CS204", title: "Data Communication — NPTEL Online Lectures", type: "web_link", url: "https://nptel.ac.in/courses/106105081", source: "platform", verified: true, language: "en" },
  { subjectCode: "CS204", unitNumber: 5, title: "OSI vs TCP/IP — Animated Explainer", type: "web_link", url: "https://www.youtube.com/results?search_query=osi+vs+tcp+ip", source: "platform", verified: false, language: "en" },
];

// ---------------------------------------------------------------------------
// QUESTION PAPERS (one per subject for variety)
// ---------------------------------------------------------------------------
const QUESTION_PAPERS: { subjectCode: string; title: string; year: number; duration: number; totalMarks: number; sections: any; analysis: any }[] = [
  {
    subjectCode: "CS201", title: "Data Structures — Winter 2023 Question Paper", year: 2023, duration: 180, totalMarks: 80,
    sections: { sections: [{ name: "A", marks: 10, questions: 10, type: "mcq" }, { name: "B", marks: 30, questions: 6, type: "short" }, { name: "C", marks: 40, questions: 4, type: "long" }] },
    analysis: { repeatedTopics: ["sorting", "linked-list", "stack-applications"], trend: "Bubble sort and linked list insertion appear every year. Binary search complexity is a guaranteed 2-mark question." },
  },
  {
    subjectCode: "CS202", title: "OOP with C++ — Winter 2023 Question Paper", year: 2023, duration: 180, totalMarks: 80,
    sections: { sections: [{ name: "A", marks: 10, questions: 10, type: "mcq" }, { name: "B", marks: 30, questions: 6, type: "short" }, { name: "C", marks: 40, questions: 4, type: "long" }] },
    analysis: { repeatedTopics: ["constructors", "inheritance", "operator-overloading", "virtual-functions"], trend: "Constructor types and inheritance programs are asked almost every year. Operator overloading is a frequent 8-mark question." },
  },
];

// ---------------------------------------------------------------------------
// MAIN SEED FUNCTION
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Lernio AI 2.0 — Seed starting...\n");

  // ---- 0) CLEAN UP existing data in dependency order ----------------------
  console.log("🧹 Cleaning existing data (dependency order)...");
  const cleanupOrder = [
    "account", "session", "verificationToken",
    "userAchievement", "achievement", "bookmark", "contribution", "resource",
    "labProgress", "codingSubmission", "codingChallenge", "tutorMessage", "tutorSession",
    "studySession", "studyTask", "revisionAttempt", "revisionSchedule",
    "quizAttempt", "questionAttempt", "lessonCompletion", "userTopicMastery",
    "questionPaper", "question", "lesson", "topic", "unit", "subject",
    "semester", "academicScheme", "programme", "department", "institution",
    "xpEvent", "user",
  ];
  for (const model of cleanupOrder) {
    try {
      // @ts-expect-error — dynamic model access
      const res = await db[model].deleteMany({});
      console.log(`   - ${model}: deleted ${res.count} rows`);
    } catch (err) {
      console.log(`   - ${model}: skipped (${(err as Error).message.split("\n")[0]})`);
    }
  }

  // ---- 1) INSTITUTION → DEPARTMENT → PROGRAMME → SCHEME → SEMESTER ------
  console.log("\n🏛  Creating academic hierarchy...");
  const institution = await db.institution.create({ data: INSTITUTION });
  const departments: Record<string, { id: string; name: string; code: string }> = {};
  const programmes: Record<string, { id: string; name: string; code: string }> = {};

  for (const item of CWIT_DEPARTMENTS) {
    const department = await db.department.create({
      data: { name: item.name, code: item.code, institutionId: institution.id },
    });
    departments[item.code] = department;

    if (item.programme) {
      const programme = await db.programme.create({
        data: {
          name: item.programme.name,
          code: item.programme.code,
          departmentId: department.id,
        },
      });
      programmes[item.programme.code] = programme;
    }
  }

  const department = departments[ACTIVE_DEPARTMENT_CODE];
  const programme = programmes[ACTIVE_PROGRAMME_CODE];
  if (!department || !programme) {
    throw new Error("Active CWIT Computer Engineering programme was not seeded.");
  }
  const scheme = await db.academicScheme.create({
    data: { ...SCHEME, institutionId: institution.id, programmeId: programme.id },
  });
  const semester = await db.semester.create({
    data: { ...SEMESTER, schemeId: scheme.id },
  });
  console.log(`   ✓ Institution: ${institution.name}`);
  console.log(`   ✓ Department: ${department.name}`);
  console.log(`   ✓ Programme: ${programme.name}`);
  console.log(`   ✓ Scheme: ${scheme.name}`);
  console.log(`   ✓ Semester: ${semester.name}`);

  // ---- 2) SUBJECTS → UNITS → TOPICS --------------------------------------
  // Map for fast lookups: subjectCode → subjectId; topicKey → topicId
  const subjectIds: Record<string, string> = {};
  const unitIds: Record<string, string> = {}; // `${subjectCode}-${unitNumber}`
  const topicIds: Record<string, string> = {}; // `${subjectCode}-${topicSlug}`

  for (const s of SUBJECTS) {
    const subject = await db.subject.create({
      data: {
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        credits: s.credits,
        icon: s.icon,
        accentColor: s.accentColor,
        mascotKey: s.mascotKey,
        description: s.description,
        semesterId: semester.id,
        schemeId: scheme.id,
      },
    });
    subjectIds[s.code] = subject.id;

    for (const u of s.units) {
      const unit = await db.unit.create({
        data: {
          number: u.number,
          title: u.title,
          description: u.description,
          weightage: u.weightage,
          subjectId: subject.id,
        },
      });
      unitIds[`${s.code}-${u.number}`] = unit.id;

      for (const t of u.topics) {
        const topic = await db.topic.create({
          data: {
            slug: t.slug,
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            examWeightage: t.examWeightage,
            unitId: unit.id,
          },
        });
        topicIds[`${s.code}-${t.slug}`] = topic.id;
      }
    }
    console.log(`   ✓ Subject ${s.code} (${s.name}) — ${s.units.length} units, ${s.units.reduce((n, u) => n + u.topics.length, 0)} topics`);
  }

  // ---- 3) LESSONS --------------------------------------------------------
  console.log(`\n📚 Creating ${LESSONS.length} rich lessons (5 learning modes each)...`);
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i];
    const topicId = topicIds[`${l.subjectCode}-${l.topicSlug}`];
    if (!topicId) {
      console.log(`   ⚠ Skipping lesson for ${l.subjectCode}/${l.topicSlug}: topic not found`);
      continue;
    }
    const unitId = unitIds[`${l.subjectCode}-${l.subjectCode === "CS201" ? 1 : 1}`]; // placeholder, replaced below

    // Find the unit this topic belongs to by scanning SUBJECTS
    let resolvedUnitId: string | undefined;
    const subj = SUBJECTS.find((x) => x.code === l.subjectCode);
    if (subj) {
      for (const u of subj.units) {
        if (u.topics.some((t) => t.slug === l.topicSlug)) {
          resolvedUnitId = unitIds[`${l.subjectCode}-${u.number}`];
          break;
        }
      }
    }
    void unitId; // unused fallback

    await db.lesson.create({
      data: {
        title: l.title,
        order: l.order,
        durationMin: l.durationMin,
        topicId,
        unitId: resolvedUnitId,
        learnContent: JSON.stringify(l.learn),
        simplifyContent: JSON.stringify(l.simplify),
        visualiseContent: JSON.stringify(l.visualise),
        practiseContent: JSON.stringify(l.practise),
        reviseContent: JSON.stringify(l.revise),
        status: "published",
        version: 1,
      },
    });
    console.log(`   [${i + 1}/${LESSONS.length}] ✓ ${l.subjectCode} — ${l.title}`);
  }

  // ---- 4) QUESTIONS ------------------------------------------------------
  console.log(`\n❓ Creating ${QUESTIONS.length} MCQ questions...`);
  for (const q of QUESTIONS) {
    const subjectId = subjectIds[q.subjectCode];
    const topicId = topicIds[`${q.subjectCode}-${q.topicSlug}`];
    if (!subjectId || !topicId) {
      console.log(`   ⚠ Skipping question: missing ${q.subjectCode}/${q.topicSlug}`);
      continue;
    }
    await db.question.create({
      data: {
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: JSON.stringify(q.options),
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation,
        hint: q.hint,
        marks: q.marks,
        negativeMark: 0,
        topicId,
        subjectId,
        unitNumber: q.unitNumber,
        source: q.source ?? "generated",
        year: q.year,
      },
    });
  }
  console.log(`   ✓ Inserted ${QUESTIONS.length} questions across 4 subjects`);

  // ---- 5) ACHIEVEMENTS ---------------------------------------------------
  console.log(`\n🏆 Creating ${ACHIEVEMENTS.length} achievements...`);
  for (const a of ACHIEVEMENTS) {
    await db.achievement.create({
      data: {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        criteria: a.criteria ? JSON.stringify(a.criteria) : null,
      },
    });
  }
  console.log(`   ✓ Inserted ${ACHIEVEMENTS.length} achievements`);

  // ---- 6) DEMO USER ------------------------------------------------------
  console.log(`\n👤 Creating demo user...`);
  const user = await db.user.create({
    data: {
      ...DEMO_USER,
      passwordHash: hashSync("student123", 12),
      institutionId: institution.id,
      schemeId: scheme.id,
    },
  });
  console.log(`   ✓ ${user.email} (role: ${user.role}, level ${user.level}, xp ${user.xp})`);

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const admin = await db.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: "Lernio Admin",
        role: "admin",
        status: "active",
        preferredLang: "en",
        xp: 0,
        level: 1,
        streak: 0,
        onboarded: true,
        profileComplete: true,
        emailVerified: new Date(),
        semesterNumber: SEMESTER.number,
        dailyMins: 120,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        passwordHash: hashSync(ADMIN_PASSWORD, 12),
        institutionId: institution.id,
        schemeId: scheme.id,
      },
    });
    console.log(`   Admin: ${admin.email} (role: ${admin.role})`);
  } else {
    console.log("   - Admin bootstrap skipped: set LERNIO_ADMIN_PASSWORD to create the admin account.");
  }

  // ---- 7) RESOURCES ------------------------------------------------------
  console.log(`\n📎 Creating ${RESOURCES.length} resources...`);
  for (const r of RESOURCES) {
    const subjectId = subjectIds[r.subjectCode];
    if (!subjectId) continue;
    const topicId = r.unitNumber ? undefined : undefined; // resources tied at subject level for now
    await db.resource.create({
      data: {
        title: r.title,
        type: r.type,
        url: r.url,
        subjectId,
        unitNumber: r.unitNumber ?? null,
        topicId: topicId ?? null,
        source: r.source,
        visibility: r.visibility ?? "public",
        verified: r.verified ?? false,
        year: r.year ?? null,
        language: r.language ?? "en",
        contributorId: null,
      },
    });
  }
  console.log(`   ✓ Inserted ${RESOURCES.length} resources`);

  // ---- 8) QUESTION PAPERS ------------------------------------------------
  console.log(`\n📝 Creating ${QUESTION_PAPERS.length} question papers...`);
  for (const qp of QUESTION_PAPERS) {
    const subjectId = subjectIds[qp.subjectCode];
    if (!subjectId) continue;
    await db.questionPaper.create({
      data: {
        title: qp.title,
        subjectId,
        year: qp.year,
        duration: qp.duration,
        totalMarks: qp.totalMarks,
        sections: JSON.stringify(qp.sections),
        analysis: JSON.stringify(qp.analysis),
      },
    });
  }
  console.log(`   ✓ Inserted ${QUESTION_PAPERS.length} question papers`);

  // ---- 9) SUMMARY --------------------------------------------------------
  const counts = {
    subjects: await db.subject.count(),
    units: await db.unit.count(),
    topics: await db.topic.count(),
    lessons: await db.lesson.count(),
    questions: await db.question.count(),
    achievements: await db.achievement.count(),
    resources: await db.resource.count(),
    questionPapers: await db.questionPaper.count(),
    users: await db.user.count(),
  };
  console.log("\n📊 Final counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(16)} ${v}`);
  }
  console.log("\n✅ Seed completed successfully.");
}

main()
  .catch(async (e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
