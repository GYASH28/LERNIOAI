/**
 * Fix placeholder worked examples — replace "Refer to the theory section above"
 * template text with real, substantive worked example solutions.
 */
const fs = require('fs');
const path = require('path');

const NOTES_DIR = path.join(process.cwd(), 'content', 'lesson-notes');

// Real worked example solutions for each subject/lesson
const REAL_SOLUTIONS = {
  'R23CP2406': {
    'os-introduction': {
      problem: 'What is an operating system? List its main functions.',
      solution: 'An Operating System (OS) is system software that acts as an interface between the user and computer hardware. It manages all hardware resources (CPU, memory, I/O devices) and provides services to application programs.\n\nMain functions of an OS:\n1. **Process Management**: Creates, schedules, and terminates processes. Uses scheduling algorithms (FCFS, SJF, Round Robin) to allocate CPU time fairly.\n2. **Memory Management**: Allocates and deallocates memory to processes. Uses techniques like paging, segmentation, and virtual memory to manage limited RAM efficiently.\n3. **File Management**: Organizes data into files and directories. Provides create, read, write, delete operations. Manages file permissions and access control.\n4. **Device Management**: Manages all I/O devices (keyboard, mouse, printer, disk). Uses device drivers to communicate with hardware.\n5. **Security & Protection**: Prevents unauthorized access to data. Implements user authentication, file permissions, and process isolation.\n6. **User Interface**: Provides CLI (Command Line Interface) or GUI (Graphical User Interface) for user interaction.\n\nExample: When you open a browser, the OS allocates memory for it, assigns CPU time slices, manages network I/O, and ensures it cannot access other processes\' memory.',
      explanation: 'This answer follows the structure: Definition → Functions (with details) → Example. In a 5-mark exam, include at least 5 functions with one-line explanations each.'
    },
    'process-management': {
      problem: 'What is a process? Explain process states with a diagram.',
      solution: 'A **process** is a program in execution. While a program is a passive entity (file on disk), a process is an active entity with its own memory space, program counter, registers, and open files.\n\n**Five Process States:**\n1. **New**: The process is being created. Example: When you double-click an app, the OS starts creating the process.\n2. **Ready**: The process is loaded in memory and waiting for CPU. Multiple processes can be in this state simultaneously in the ready queue.\n3. **Running**: CPU is executing the process instructions. Only one process per core can be in this state at a time.\n4. **Waiting (Blocked)**: The process is waiting for an I/O operation or event to complete. Example: Waiting for user input or disk read.\n5. **Terminated**: The process has finished execution. The OS reclaims its resources.\n\n**State Transitions:**\n- New → Ready: Process admitted to ready queue\n- Ready → Running: Scheduler dispatches the process (context switch)\n- Running → Ready: Time slice expires (preemption)\n- Running → Waiting: I/O or event wait request\n- Waiting → Ready: I/O or event completes\n- Running → Terminated: Process exits or is killed\n\n**Example:** When you open a file in a text editor:\n1. New: OS creates the editor process\n2. Ready: Editor waits in ready queue\n3. Running: CPU starts executing editor code\n4. Waiting: Editor waits for disk to read the file\n5. Ready: File read completes, editor back in ready queue\n6. Running: CPU continues executing editor\n7. Terminated: You close the editor',
      explanation: 'In the exam, draw the 5-state diagram with arrows showing all transitions. Explain each state with a one-line description. A common mistake is forgetting the Running→Ready (preemption) transition.'
    },
    'memory-management': {
      problem: 'Explain paging in memory management with an example.',
      solution: '**Paging** is a memory management technique that eliminates external fragmentation by dividing logical memory into fixed-size blocks called **pages** and physical memory into blocks of the same size called **frames**.\n\n**Key Concepts:**\n- **Page**: Fixed-size block of logical memory (typically 4KB). The OS divides a process\'s logical address space into pages.\n- **Frame**: Fixed-size block of physical memory (same size as page). Physical memory is divided into frames.\n- **Page Table**: A data structure that maps page numbers to frame numbers. Each process has its own page table.\n\n**How Paging Works:**\n1. The CPU generates a logical address: `Page Number | Offset`\n2. The OS looks up the page number in the page table to find the corresponding frame number.\n3. The physical address is: `Frame Number | Offset`\n4. The data is accessed at the physical address.\n\n**Example:**\n- Page size = 4KB = 4096 bytes\n- Logical address: 8196 (binary: 000000000000001000000000001100)\n  - Page number = 8196 / 4096 = 2 (page 2)\n  - Offset = 8196 % 4096 = 4 (byte 4 within the page)\n- Page table says page 2 is in frame 5\n- Physical address = 5 × 4096 + 4 = 20484\n\n**Advantages:**\n- No external fragmentation (any free frame can hold any page)\n- Simple memory allocation\n\n**Disadvantages:**\n- Internal fragmentation (last page may not be full)\n- Page table overhead (extra memory for page table)\n- Two memory accesses needed (page table + actual data)',
      explanation: 'In the exam, draw the page table mapping diagram showing logical address → page table → physical address. Include the formula: Physical Address = Frame Number × Page Size + Offset.'
    }
  },
  'R23CP2407': {
    'introduction-to-dbms': {
      problem: 'What is DBMS? Explain its advantages over file systems.',
      solution: 'A **Database Management System (DBMS)** is software that creates, manages, and controls access to a database. It provides an organized way to store, retrieve, and manage data efficiently.\n\nExamples: MySQL, PostgreSQL, Oracle, MongoDB.\n\n**Advantages of DBMS over File Systems:**\n\n1. **Data Independence**: In file systems, application code depends on file format. In DBMS, the application does not know how data is stored physically — changing storage does not require changing application code.\n\n2. **Reduced Data Redundancy**: File systems often duplicate data across multiple files. DBMS normalizes data to minimize redundancy, saving storage and preventing inconsistencies.\n\n3. **Data Consistency**: If the same data is in multiple files and one is updated, others become inconsistent. DBMS ensures all copies are updated simultaneously.\n\n4. **Concurrency Control**: File systems allow only one user at a time (or risk corruption). DBMS supports multiple users simultaneously using locking and transaction isolation.\n\n5. **Data Security**: File systems have basic OS-level permissions. DBMS provides user authentication, role-based access control, and encryption.\n\n6. **Data Integrity**: DBMS enforces integrity constraints (primary key, foreign key, NOT NULL, CHECK) that file systems cannot.\n\n7. **Backup and Recovery**: DBMS provides automated backup, transaction logging, and crash recovery. File systems rely on manual backups.\n\n8. **Query Capability**: DBMS provides SQL for complex queries. File systems require custom code for every query.\n\n**Example:** A college using file systems stores student data in separate files for attendance, marks, and fees. If a student changes address, it must be updated in ALL files — risk of inconsistency. A DBMS stores this data once in a centralized database with relationships, ensuring consistency.',
      explanation: 'In a 5-mark exam, list at least 5 advantages with one-line explanations. The key word to remember is "redundancy" — DBMS reduces it, file systems cause it.'
    },
    'dbms-architecture': {
      problem: 'Explain the three-schema architecture of DBMS.',
      solution: 'The **three-schema architecture** (also called ANSI-SPARC architecture) separates the database into three levels to achieve data independence:\n\n1. **External Schema (View Level)**:\n   - What the end user sees.\n   - Different users can have different views of the same data.\n   - Example: A student sees only their own marks; a teacher sees all students\' marks.\n   - Hides unnecessary details from each user.\n\n2. **Conceptual Schema (Logical Level)**:\n   - Describes the entire database structure — all tables, relationships, constraints.\n   - What the DBA (Database Administrator) designs.\n   - Example: "Students table has columns: roll_no, name, email, dept_id. Dept_id is a foreign key to Departments table."\n   - Hides physical storage details.\n\n3. **Internal Schema (Physical Level)**:\n   - How data is actually stored on disk.\n   - Includes file organization, indexes, storage structures.\n   - Example: "Students table is stored as a B+ tree indexed on roll_no. Data files are in /var/db/students.dat."\n\n**Data Independence:**\n- **Logical Independence**: Change conceptual schema (add a column) without changing external schema (views) or application code.\n- **Physical Independence**: Change internal schema (change storage from B+ tree to hash index) without changing conceptual schema.\n\n**Example:**\n- External: "SELECT name, marks FROM student_marks WHERE roll_no = 23" (student view)\n- Conceptual: Students(roll_no, name, email, dept_id) + Marks(roll_no, subject, marks)\n- Internal: Students stored as B+ tree on roll_no, Marks stored as hash table on roll_no',
      explanation: 'Draw the three-level diagram with External at top, Conceptual in middle, Internal at bottom. Arrows show "mapping" between levels. Key concept: data independence.'
    },
    'er-model': {
      problem: 'Design an ER diagram for a college database with students, courses, and departments.',
      solution: '**Entities and Attributes:**\n\n1. **Student** (entity)\n   - Roll_No (Primary Key)\n   - Name\n   - Email\n   - Semester\n   - Division\n\n2. **Department** (entity)\n   - Dept_ID (Primary Key)\n   - Dept_Name\n   - HOD\n\n3. **Course** (entity)\n   - Course_ID (Primary Key)\n   - Course_Name\n   - Credits\n   - Semester_Offered\n\n**Relationships:**\n\n1. **Student belongs to Department** (Many-to-One)\n   - Each student belongs to exactly one department.\n   - Each department has many students.\n   - Relationship: "Belongs_To" with cardinality M:1\n\n2. **Department offers Course** (One-to-Many)\n   - Each department offers multiple courses.\n   - Each course belongs to exactly one department.\n   - Relationship: "Offers" with cardinality 1:N\n\n3. **Student enrolls in Course** (Many-to-Many)\n   - Each student enrolls in multiple courses.\n   - Each course has multiple students enrolled.\n   - Relationship: "Enrolls" with cardinality M:N\n   - This creates a bridge table: Enrollment(Student_Roll_No, Course_ID, Semester, Grade)\n\n**ER Diagram Description (text representation):**\n```\n[Student] ---belongs_to(M:1)---> [Department] ---offers(1:N)---> [Course]\n    |                                                           ^\n    +-------------------enrolls(M:N)---------------------------+\n                         |\n                    [Enrollment]\n                    (bridge table)\n```\n\n**Converted to Tables:**\n1. Student(Roll_No PK, Name, Email, Semester, Division, Dept_ID FK)\n2. Department(Dept_ID PK, Dept_Name, HOD)\n3. Course(Course_ID PK, Course_Name, Credits, Semester_Offered, Dept_ID FK)\n4. Enrollment(Roll_No FK, Course_ID FK, Semester, Grade, PK(Roll_No, Course_ID))',
      explanation: 'In the exam, draw rectangles for entities, diamonds for relationships, ovals for attributes, and lines connecting them. Label cardinality (1:1, 1:N, M:N) on each relationship.'
    },
    'normalization': {
      problem: 'Normalize the following table to 3NF: Student(RollNo, Name, DeptID, DeptName, DeptHOD)',
      solution: '**Given Table (UNF):**\nStudent(RollNo, Name, DeptID, DeptName, DeptHOD)\n\n**Problems with UNF:**\n- DeptName and DeptHOD depend on DeptID, not on RollNo → transitive dependency\n- If department changes HOD, must update ALL student rows for that department → update anomaly\n- If a department has no students, its info is lost → deletion anomaly\n\n**Step 1: First Normal Form (1NF)**\n- Ensure all attributes are atomic (no repeating groups)\n- Already in 1NF (all values are atomic)\n\n**Step 2: Second Normal Form (2NF)**\n- Remove partial dependencies (non-key attributes must depend on the ENTIRE primary key)\n- Primary key is RollNo (single column) → no partial dependencies possible\n- Already in 2NF\n\n**Step 3: Third Normal Form (3NF)**\n- Remove transitive dependencies (non-key attributes must not depend on other non-key attributes)\n- DeptName and DeptHOD depend on DeptID (not on RollNo directly) → transitive dependency!\n- Solution: Split into two tables\n\n**After 3NF:**\n1. **Student**(RollNo PK, Name, DeptID FK)\n2. **Department**(DeptID PK, DeptName, DeptHOD)\n\n**Verification:**\n- Student table: RollNo → Name, RollNo → DeptID ✓ (no transitive dependency)\n- Department table: DeptID → DeptName, DeptID → DeptHOD ✓ (DeptID is primary key)\n\n**Benefits achieved:**\n- No data redundancy (department info stored once)\n- No update anomaly (change HOD in one place)\n- No deletion anomaly (department exists even without students)\n- No insertion anomaly (add department before any student enrolls)',
      explanation: 'In the exam, show each step clearly: UNF → 1NF → 2NF → 3NF. Identify the transitive dependency (DeptID → DeptName, DeptHOD) and explain why it violates 3NF. Show the final tables with primary keys and foreign keys marked.'
    },
    'sql-basics': {
      problem: 'Write SQL queries: (1) Find all students in semester 4, (2) Count students per department, (3) Find students whose name starts with "A".',
      solution: '**Given Table:** Student(RollNo, Name, Email, Semester, Division, DeptID)\n\n**Query 1: Find all students in semester 4**\n```sql\nSELECT RollNo, Name, Email, Division, DeptID\nFROM Student\nWHERE Semester = 4;\n```\nThis selects all columns for students where Semester equals 4.\n\n**Query 2: Count students per department**\n```sql\nSELECT DeptID, COUNT(*) AS StudentCount\nFROM Student\nGROUP BY DeptID;\n```\nThis groups rows by DeptID and counts the number of students in each group. Result example:\n| DeptID | StudentCount |\n|--------|-------------|\n| DCOMP  | 45          |\n| DCIOT  | 30          |\n\n**Query 3: Find students whose name starts with "A"**\n```sql\nSELECT RollNo, Name, Semester\nFROM Student\nWHERE Name LIKE \'A%\';\n```\nThe LIKE operator with \'A%\' pattern matches any name starting with \'A\'. The % wildcard matches any sequence of characters after \'A\'.\n\n**Bonus Query — Find students in semester 4 sorted by name:**\n```sql\nSELECT RollNo, Name, Email\nFROM Student\nWHERE Semester = 4\nORDER BY Name ASC;\n```',
      explanation: 'Common exam mistakes: (1) Forgetting the semicolon at the end (2) Using = instead of LIKE for pattern matching (3) Forgetting GROUP BY when using aggregate functions like COUNT. Always remember: WHERE filters rows before grouping, HAVING filters after grouping.'
    },
    'transactions-acid': {
      problem: 'Explain ACID properties with an example of a bank transfer.',
      solution: '**ACID Properties** ensure reliable transaction processing in databases.\n\n**Example: Bank Transfer — Transfer ₹5000 from Account A (balance: ₹10000) to Account B (balance: ₹3000)**\n\n1. **Atomicity** — "All or Nothing"\n   - A transaction is treated as a single unit — either ALL operations succeed, or NONE do.\n   - If the transfer fails after debiting A but before crediting B, the debit must be rolled back.\n   - Operations: (1) Debit A: 10000-5000=5000, (2) Credit B: 3000+5000=8000\n   - If step 2 fails, step 1 is undone → A is back to 10000.\n   - Implementation: Transaction log (rollback/commit)\n\n2. **Consistency** — "Valid State to Valid State"\n   - A transaction takes the database from one valid state to another.\n   - Before: A=10000, B=3000, Total=13000\n   - After: A=5000, B=8000, Total=13000 (total is preserved)\n   - If A or B had a CHECK constraint (balance >= 0), the transaction must not violate it.\n   - Implementation: Integrity constraints (PK, FK, CHECK, UNIQUE)\n\n3. **Isolation** — "Concurrent Transactions Don\'t Interfere"\n   - Multiple transactions executing concurrently should not affect each other.\n   - If two transfers happen simultaneously (A→B and C→A), the results should be as if they executed one after the other.\n   - Without isolation: Lost update, dirty read, non-repeatable read problems.\n   - Implementation: Locking (shared/exclusive), MVCC, isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable)\n\n4. **Durability** — "Permanent Once Committed"\n   - Once a transaction is committed, its changes are permanent — even if the system crashes.\n   - After the transfer is committed and the bank\'s server crashes, the balances must still be A=5000, B=8000 on recovery.\n   - Implementation: Write-ahead log (WAL), database backups\n\n**SQL Example:**\n```sql\nBEGIN TRANSACTION;\n  UPDATE Accounts SET Balance = Balance - 5000 WHERE AccountNo = \'A\';\n  UPDATE Accounts SET Balance = Balance + 5000 WHERE AccountNo = \'B\';\nCOMMIT;\n-- If any statement fails: ROLLBACK;\n```',
      explanation: 'In the exam, explain each property with the bank transfer example. Key: Atomicity = all or nothing, Consistency = rules not violated, Isolation = no interference, Durability = survives crashes.'
    }
  },
  'R23CP2408': {
    'network-introduction': {
      problem: 'What is a computer network? Explain its types based on geographical area.',
      solution: 'A **computer network** is a collection of interconnected devices (computers, servers, printers, IoT devices) that can share resources and communicate with each other using common protocols.\n\n**Types of Networks Based on Geographical Area:**\n\n1. **PAN (Personal Area Network)**\n   - Range: ~10 meters\n   - Connects personal devices within an individual\'s workspace.\n   - Technologies: Bluetooth, USB, Zigbee\n   - Example: Connecting wireless headphones to your phone, or a smartwatch to your phone.\n\n2. **LAN (Local Area Network)**\n   - Range: Up to 1 km (building, campus, office)\n   - High speed (100 Mbps - 10 Gbps), low error rate.\n   - Technologies: Ethernet (wired), Wi-Fi (wireless)\n   - Example: College computer lab where all PCs are connected to a single switch, sharing a printer and internet.\n\n3. **MAN (Metropolitan Area Network)**\n   - Range: 1-50 km (city-wide)\n   - Connects multiple LANs within a city.\n   - Technologies: Fiber optic, WiMAX\n   - Example: Cable TV network, city-wide Wi-Fi, connecting all branches of a bank within a city.\n\n4. **WAN (Wide Area Network)**\n   - Range: Unlimited (country, continent, global)\n   - Lower speed than LAN, higher error rate.\n   - Technologies: Leased lines, satellite, MPLS, VPN\n   - Example: The Internet is the largest WAN. A company connecting offices in Mumbai, Delhi, and Bangalore.\n\n**Comparison Table:**\n| Type | Range | Speed | Ownership | Example |\n|------|-------|-------|-----------|--------|\n| PAN | ~10m | 1-3 Mbps | Private | Bluetooth headphones |\n| LAN | <1km | 100M-10G | Private/Organizational | College lab |\n| MAN | 1-50km | 10-100M | Public/Private | Cable TV |\n| WAN | Unlimited | 1-100M | Public (ISP) | Internet |',
      explanation: 'In the exam, draw a comparison table with range, speed, ownership, and example for each type. The key differentiator is geographical area — PAN (personal) → LAN (building) → MAN (city) → WAN (global).'
    },
    'osi-model': {
      problem: 'Explain the OSI model with the function of each layer.',
      solution: 'The **OSI (Open Systems Interconnection) Model** is a 7-layer reference model developed by ISO (International Organization for Standardization) in 1984. It standardizes network communication into layers, each with specific functions.\n\n**The 7 Layers (Bottom to Top):**\n\n**Layer 1: Physical Layer**\n- Transmits raw bits over a physical medium (copper cable, fiber, radio waves).\n- Defines voltage levels, cable specifications, connector pins.\n- Devices: Hub, Repeater, Cable, Connector\n- Example: Ethernet cable carrying electrical signals representing 0s and 1s.\n\n**Layer 2: Data Link Layer**\n- Ensures reliable node-to-node data transfer on the same network.\n- Functions: Framing (divide data into frames), error detection (CRC), flow control, MAC addressing.\n- Devices: Switch, Bridge, NIC (Network Interface Card)\n- Example: Ethernet frame with source and destination MAC addresses.\n\n**Layer 3: Network Layer**\n- Routes packets between different networks.\n- Functions: Logical addressing (IP), routing, packet forwarding.\n- Devices: Router, Layer-3 Switch\n- Example: IP packet with source IP 192.168.1.10 and destination IP 10.0.0.5.\n\n**Layer 4: Transport Layer**\n- Provides end-to-end reliable (or unreliable) data delivery.\n- Functions: Segmentation, port addressing, error control, flow control.\n- Protocols: TCP (reliable, connection-oriented), UDP (fast, connectionless)\n- Example: TCP segment with source port 8080, destination port 80 (HTTP).\n\n**Layer 5: Session Layer**\n- Manages sessions (connections) between applications.\n- Functions: Session establishment, maintenance, termination, synchronization.\n- Example: A video call session — establishing, maintaining, and closing the call.\n\n**Layer 6: Presentation Layer**\n- Translates data between application and network formats.\n- Functions: Data encryption/decryption, compression, encoding (ASCII, UTF-8).\n- Example: SSL/TLS encryption, JPEG image compression.\n\n**Layer 7: Application Layer**\n- Provides network services directly to user applications.\n- Protocols: HTTP (web), FTP (file transfer), SMTP (email), DNS (name resolution)\n- Example: Browser using HTTP to request a webpage from a server.\n\n**Mnemonic to remember layers (bottom to top):**\n"Please Do Not Throw Sausage Pizza Away"\nPhysical → Data Link → Network → Transport → Session → Presentation → Application',
      explanation: 'In the exam, draw the 7-layer stack with layer numbers. For each layer, include: name, function (1 line), protocol/device, and example. The mnemonic "Please Do Not Throw Sausage Pizza Away" helps remember the order.'
    },
    'ip-addressing': {
      problem: 'Given IP address 192.168.10.50/26, find: (1) Network ID, (2) Broadcast ID, (3) Number of hosts, (4) Host range.',
      solution: '**Given:** IP = 192.168.10.50, Subnet Mask = /26 (255.255.255.192)\n\n**Step 1: Convert to Binary**\n```\nIP:       11000000.10101000.00001010.00110010  (192.168.10.50)\nMask /26: 11111111.11111111.11111111.11000000  (255.255.255.192)\n```\n\n**Step 2: Find Network ID**\n- AND operation between IP and Mask:\n```\n  11000000.10101000.00001010.00110010  (IP)\n& 11111111.11111111.11111111.11000000  (Mask)\n= 11000000.10101000.00001010.00000000  (192.168.10.0)\n```\n- **Network ID = 192.168.10.0**\n\n**Step 3: Find Broadcast ID**\n- Set all host bits (last 6 bits) to 1:\n```\n  11000000.10101000.00001010.00111111  (192.168.10.63)\n```\n- **Broadcast ID = 192.168.10.63**\n\n**Step 4: Number of Hosts**\n- Host bits = 32 - 26 = 6 bits\n- Total addresses = 2^6 = 64\n- Usable hosts = 2^6 - 2 = 62 (subtract network ID and broadcast ID)\n- **Number of usable hosts = 62**\n\n**Step 5: Host Range**\n- First usable host: Network ID + 1 = 192.168.10.1\n- Last usable host: Broadcast ID - 1 = 192.168.10.62\n- **Host range: 192.168.10.1 to 192.168.10.62**\n\n**Summary:**\n| Parameter | Value |\n|-----------|-------|\n| IP Address | 192.168.10.50/26 |\n| Network ID | 192.168.10.0 |\n| Broadcast ID | 192.168.10.63 |\n| Subnet Mask | 255.255.255.192 |\n| Total Addresses | 64 |\n| Usable Hosts | 62 |\n| Host Range | 192.168.10.1 - 192.168.10.62 |',
      explanation: 'Key formula: Usable hosts = 2^h - 2, where h = host bits (32 - subnet mask). Always subtract 2 (network ID and broadcast ID are not assignable). In the exam, show the binary AND operation clearly.'
    }
  }
};

// Fix the placeholder worked examples
let fixed = 0;
Object.entries(REAL_SOLUTIONS).forEach(([subjectCode, lessons]) => {
  // Find the file for this subject
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json'));
  const file = files.find(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf8')).subjectCode === subjectCode;
    } catch { return false; }
  });
  if (!file) return;

  const data = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, file), 'utf8'));
  let modified = false;

  data.units?.forEach(u => {
    u.lessons?.forEach(l => {
      if (lessons[l.slug] && l.workedExamples?.[0]) {
        const newSolution = lessons[l.slug];
        // Check if current solution is a placeholder
        if (/refer to the theory|refer to.*above|structure your answer/i.test(l.workedExamples[0].solution || '')) {
          l.workedExamples[0] = {
            title: l.workedExamples[0].title || 'Worked Example',
            problem: newSolution.problem,
            solution: newSolution.solution,
            explanation: newSolution.explanation,
          };
          modified = true;
          fixed++;
          console.log('Fixed:', subjectCode + '/' + l.slug);
        }
      }
    });
  });

  if (modified) {
    fs.writeFileSync(path.join(NOTES_DIR, file), JSON.stringify(data, null, 2));
  }
});

// Also fix CIOT copies (same subject codes with CI prefix)
const ciotMapping = {
  'R23CI2606': 'R23CP2406', // Embedded OS → OS
  'R23CI2607': 'R23CP2407', // DBMS → DBMS
  'R23CI2608': 'R23CP2408', // Networks → Networks
};

Object.entries(ciotMapping).forEach(([ciotCode, compCode]) => {
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json'));
  const file = files.find(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf8')).subjectCode === ciotCode;
    } catch { return false; }
  });
  if (!file) return;

  const data = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, file), 'utf8'));
  let modified = false;

  data.units?.forEach(u => {
    u.lessons?.forEach(l => {
      if (REAL_SOLUTIONS[compCode]?.[l.slug] && l.workedExamples?.[0]) {
        if (/refer to the theory|refer to.*above|structure your answer/i.test(l.workedExamples[0].solution || '')) {
          const newSolution = REAL_SOLUTIONS[compCode][l.slug];
          l.workedExamples[0] = {
            title: l.workedExamples[0].title || 'Worked Example',
            problem: newSolution.problem,
            solution: newSolution.solution,
            explanation: newSolution.explanation,
          };
          modified = true;
          fixed++;
          console.log('Fixed:', ciotCode + '/' + l.slug);
        }
      }
    });
  });

  if (modified) {
    fs.writeFileSync(path.join(NOTES_DIR, file), JSON.stringify(data, null, 2));
  }
});

console.log('\nTotal fixed:', fixed);
