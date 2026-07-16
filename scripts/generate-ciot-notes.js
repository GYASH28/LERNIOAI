/**
 * Generate lesson-note JSONs for the 8 remaining IoT-specific CIOT subjects.
 * Uses real educational content — no placeholders.
 */
const fs = require('fs');
const path = require('path');

const NOTES_DIR = path.join(process.cwd(), 'content', 'lesson-notes');

// Load CIOT curriculum for unit structure
function loadCurriculum(semester) {
  try {
    return JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'content/curriculum/cwit-r23/ciot/semester-' + semester + '.json'),
      'utf8'
    ));
  } catch { return null; }
}

// Template for a lesson with real content
function makeLesson(slug, title, durationMin, difficulty, overview, theory, keyConcepts, flashcards, practiceQuestions, callouts, workedExamples, vivaQuestions, examTips, commonMistakes) {
  return {
    slug,
    title,
    durationMin: durationMin || 15,
    difficulty: difficulty || 'medium',
    overview,
    keyConcepts: keyConcepts || [],
    formulas: [],
    tables: [],
    commonMistakes: commonMistakes || [],
    examTips: examTips || [],
    practiceQuestions: practiceQuestions || [],
    objectives: [`Understand the key concepts of ${title}`, `Apply ${title} principles in practical scenarios`, `Prepare for exam questions on ${title}`],
    prerequisites: ['Basic understanding of computer systems'],
    theory,
    analogies: [],
    flowcharts: [],
    mindMaps: [],
    complexity: null,
    workedExamples: workedExamples || [],
    vivaQuestions: vivaQuestions || [],
    interviewQuestions: [],
    examQuestions: [],
    revisionSummary: theory.substring(0, 200) + '...',
    cheatSheet: keyConcepts?.slice(0, 5).map(c => c.split(':')[0] || c.substring(0, 50)) || [],
    mnemonics: [],
    callouts: callouts || [],
    flashcards: flashcards || [],
    aiSummaries: [],
    recommendedNextLessons: [],
  };
}

// Subject definitions with real content
const subjects = {
  'R23CI2603': {
    name: 'Digital Techniques & Microcontroller',
    semester: 3,
    credits: 4,
    units: [
      {
        number: 1, title: 'Number Systems and Codes', weightage: 20,
        lessons: [
          makeLesson('number-systems', 'Number Systems', 15, 'medium',
            'Number systems are the foundation of digital electronics. This lesson covers binary, octal, decimal, and hexadecimal number systems, their conversions, and arithmetic operations.',
            '## Introduction\n\nA number system is a mathematical notation for representing numbers using a set of digits. In digital electronics, we use different number systems to represent and process information.\n\n## Types of Number Systems\n\n1. **Decimal (Base-10)**: Uses digits 0-9. Example: 254 = 2×10² + 5×10¹ + 4×10⁰\n2. **Binary (Base-2)**: Uses digits 0 and 1. Example: 1011 = 1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 11\n3. **Octal (Base-8)**: Uses digits 0-7. Example: 17 = 1×8¹ + 7×8⁰ = 15\n4. **Hexadecimal (Base-16)**: Uses digits 0-9 and A-F. Example: 2F = 2×16¹ + 15×16⁰ = 47\n\n## Conversions\n\n**Decimal to Binary**: Divide by 2, collect remainders in reverse order.\nExample: 25 ÷ 2 = 12 R1, 12 ÷ 2 = 6 R0, 6 ÷ 2 = 3 R0, 3 ÷ 2 = 1 R1, 1 ÷ 2 = 0 R1 → 11001\n\n**Binary to Hexadecimal**: Group binary digits in groups of 4 from right, convert each group.\nExample: 11001011 → 1100 1011 → C B → CB',
            ['Decimal: Base-10, digits 0-9, used in everyday life', 'Binary: Base-2, digits 0-1, used in computers', 'Hexadecimal: Base-16, digits 0-9 and A-F, used in memory addressing', 'Octal: Base-8, digits 0-7, used in Unix file permissions'],
            [{front:'Convert 42 to binary.',back:'101010. 42÷2=21 R0, 21÷2=10 R1, 10÷2=5 R0, 5÷2=2 R1, 2÷2=1 R0, 1÷2=0 R1. Read remainders bottom-up: 101010',hint:'Divide by 2 repeatedly'}],
            [{question:'What is the binary equivalent of decimal 25?',options:['11001','10011','11010','10101'],answer:0,explanation:'25÷2=12 R1, 12÷2=6 R0, 6÷2=3 R0, 3÷2=1 R1, 1÷2=0 R1. Reading bottom-up: 11001'}],
            [{type:'exam-tip',content:'Always verify conversions by converting back to the original base.'}],
            [{title:'Decimal to Hexadecimal',problem:'Convert 255 to hexadecimal.',solution:'255 ÷ 16 = 15 remainder 15. 15 ÷ 16 = 0 remainder 15. Reading bottom-up: FF',explanation:'15 in hex is F, so 255 decimal = FF hexadecimal.'}],
            [{marks:2,question:'What is the base of hexadecimal number system?',modelAnswer:'Base-16. It uses 16 digits: 0-9 and A-F where A=10, B=11, C=12, D=13, E=14, F=15.'}],
            ['Practice conversions daily — they appear in every exam', 'For binary to hex, group from RIGHT to LEFT in groups of 4'],
            ['Confusing MSB (Most Significant Bit) with LSB — MSB is leftmost, LSB is rightmost']
          ),
          makeLesson('logic-gates', 'Logic Gates', 15, 'medium',
            'Logic gates are the building blocks of digital circuits. This lesson covers AND, OR, NOT, NAND, NOR, XOR, and XNOR gates, their truth tables, and applications.',
            '## Introduction\n\nLogic gates are electronic circuits that perform boolean operations on one or more binary inputs to produce a single binary output.\n\n## Basic Logic Gates\n\n1. **AND Gate**: Output is 1 only when ALL inputs are 1. Symbol: ·\n   - Truth table: 0·0=0, 0·1=0, 1·0=0, 1·1=1\n\n2. **OR Gate**: Output is 1 when ANY input is 1. Symbol: +\n   - Truth table: 0+0=0, 0+1=1, 1+0=1, 1+1=1\n\n3. **NOT Gate (Inverter)**: Output is the complement of input. Symbol: ‾\n   - Truth table: 0→1, 1→0\n\n## Universal Gates\n\n4. **NAND Gate**: AND followed by NOT. Output is 0 only when ALL inputs are 1.\n5. **NOR Gate**: OR followed by NOT. Output is 1 only when ALL inputs are 0.\n\nNAND and NOR are called universal gates because any logic function can be implemented using only NAND or only NOR gates.\n\n## Derived Gates\n\n6. **XOR (Exclusive OR)**: Output is 1 when inputs are different. Used in adders and parity checks.\n7. **XNOR (Exclusive NOR)**: Output is 1 when inputs are same. Used in comparators.',
            ['AND: Output 1 only if ALL inputs are 1', 'OR: Output 1 if ANY input is 1', 'NOT: Inverts the input (0→1, 1→0)', 'NAND: Universal gate — AND + NOT, output 0 only if all inputs 1', 'XOR: Output 1 if inputs are different — used in adders'],
            [{front:'What is a universal gate?',back:'A gate that can implement any logic function. NAND and NOR are universal gates.',hint:'Think: which gates can build ALL other gates?'}],
            [{question:'Which gate outputs 1 only when all inputs are 1?',options:['OR','AND','NOT','XOR'],answer:1,explanation:'AND gate outputs 1 only when ALL inputs are 1. Otherwise output is 0.'}],
            [{type:'note',content:'NAND and NOR gates are called universal gates because any boolean function can be implemented using only NAND or only NOR gates.'}],
            [{title:'Implementing NOT using NAND',problem:'Implement a NOT gate using only NAND gates.',solution:'Connect both inputs of a NAND gate together. NAND(A, A) = NOT(A AND A) = NOT(A).',explanation:'When both inputs are the same, AND gives the input itself, and NAND inverts it.'}],
            [{marks:2,question:'What is the difference between XOR and OR gate?',modelAnswer:'OR gate outputs 1 when any input is 1 (including both). XOR outputs 1 only when inputs are different — when both inputs are 1, XOR outputs 0 but OR outputs 1.'}],
            ['Memorize truth tables for all 7 gates — they appear in every exam', 'NAND is the most commonly used gate in IC fabrication'],
            ['Forgetting that XOR of two 1s gives 0, not 1']
          ),
        ]
      },
      {
        number: 2, title: 'Combinational and Sequential Circuits', weightage: 25,
        lessons: [
          makeLesson('combinational-circuits', 'Combinational Circuits', 18, 'hard',
            'Combinational circuits produce outputs based only on current inputs. This lesson covers adders, subtractors, multiplexers, demultiplexers, encoders, and decoders.',
            '## Introduction\n\nCombinational circuits are digital circuits whose output depends only on the current input, not on any previous inputs. They have no memory.\n\n## Types of Combinational Circuits\n\n1. **Half Adder**: Adds two 1-bit numbers. Outputs: Sum = A XOR B, Carry = A AND B\n\n2. **Full Adder**: Adds three 1-bit numbers (A, B, Carry-in). Outputs: Sum = A XOR B XOR Cin, Carry = (A AND B) OR (Cin AND (A XOR B))\n\n3. **Multiplexer (MUX)**: Selects one of many inputs and routes it to a single output. A 4:1 MUX has 4 inputs, 2 select lines, 1 output.\n\n4. **Demultiplexer (DEMUX)**: Routes a single input to one of many outputs. Reverse of MUX.\n\n5. **Encoder**: Converts 2ⁿ input lines to n output lines. Priority encoder assigns priority to inputs.\n\n6. **Decoder**: Converts n input lines to 2ⁿ output lines. Used in memory address decoding.\n\n## Applications\n- Adders: Arithmetic circuits, ALU\n- MUX: Data routing, parallel-to-serial conversion\n- Decoder: Memory addressing, display driving (BCD to 7-segment)',
            ['Half Adder: Sum = A⊕B, Carry = A·B', 'Full Adder: Adds 3 bits (A, B, Cin) — Sum = A⊕B⊕Cin', 'Multiplexer: Data selector — routes 1 of N inputs to output', 'Decoder: Converts binary code to 2^n output lines', 'Encoder: Opposite of decoder — converts 2^n inputs to n-bit code'],
            [{front:'What is the difference between a half adder and a full adder?',back:'Half adder adds 2 bits (A, B) producing Sum and Carry. Full adder adds 3 bits (A, B, Carry-in) producing Sum and Carry-out. Full adders are cascaded to build multi-bit adders.',hint:'Think about carry propagation'}],
            [{question:'How many select lines does a 8:1 multiplexer need?',options:['2','3','4','8'],answer:1,explanation:'A MUX needs log₂(N) select lines. For 8 inputs: log₂(8) = 3 select lines.'}],
            [{type:'tip',content:'A multiplexer is also called a "data selector" — it selects which input to route to the output.'}],
            [{title:'4-bit Adder Design',problem:'Design a 4-bit adder using full adders.',solution:'Cascade 4 full adders. Connect A0-A3 and B0-B3 as inputs. Carry-out of each FA connects to Carry-in of the next. C0=0, C1=FA0 carry, C2=FA1 carry, C3=FA2 carry, C4=FA3 carry. Sum = S0-S3.',explanation:'This is called a ripple carry adder. The carry ripples from LSB to MSB. For faster addition, use a carry-lookahead adder.'}],
            [{marks:3,question:'Explain the working of a 4:1 multiplexer.',modelAnswer:'A 4:1 MUX has 4 data inputs (I0-I3), 2 select lines (S0, S1), and 1 output. The select lines choose which input appears at the output. When S1S0=00, output=I0. When S1S0=01, output=I1. When S1S0=10, output=I2. When S1S0=11, output=I3.'}],
            ['Remember: MUX = many inputs, one output. DEMUX = one input, many outputs', 'Full adder truth table has 8 rows (3 inputs)'],
            ['Confusing encoder with decoder — encoder has many inputs few outputs, decoder has few inputs many outputs']
          ),
          makeLesson('flip-flops', 'Flip-Flops and Counters', 18, 'hard',
            'Flip-flops are the basic memory elements in digital circuits. This lesson covers SR, JK, D, and T flip-flops, registers, and counters.',
            '## Introduction\n\nFlip-flops are sequential circuits that store 1 bit of information. They have two stable states (SET and RESET) and can change state based on clock signals.\n\n## Types of Flip-Flops\n\n1. **SR Flip-Flop**: Set-Reset. S=1 sets output to 1, R=1 resets to 0. S=R=1 is invalid.\n\n2. **JK Flip-Flop**: Improved SR. J=K=1 toggles the output (no invalid state). J is set, K is reset.\n\n3. **D Flip-Flop (Data/Delay)**: Output follows input D on clock edge. Used for data storage.\n\n4. **T Flip-Flop (Toggle)**: T=1 toggles output on clock edge. Used in counters.\n\n## Registers\nA register is a group of flip-flops used to store multi-bit data.\n- **Shift Register**: Shifts data left or right on each clock pulse.\n- **Parallel Register**: Loads all bits simultaneously.\n\n## Counters\nCounters are sequential circuits that count clock pulses.\n- **Asynchronous (Ripple) Counter**: Each flip-flop triggers the next. Simple but slow.\n- **Synchronous Counter**: All flip-flops share the same clock. Fast but complex.\n- **Up Counter**: Counts 0,1,2,...,N-1,0\n- **Down Counter**: Counts N-1,N-2,...,1,0,N-1\n- **Modulo-N Counter**: Counts 0 to N-1 (a 3-bit counter is Mod-8).',
            ['SR Flip-Flop: Set (S=1) and Reset (R=1). Invalid when S=R=1', 'JK Flip-Flop: J=Set, K=Reset, J=K=1 toggles. No invalid state', 'D Flip-Flop: Output follows D on clock edge — used for data storage', 'T Flip-Flop: Toggles output on clock edge — used in counters', 'Counter: Counts clock pulses — ripple (async) or synchronous'],
            [{front:'What is the race-around condition in JK flip-flop?',back:'When J=K=1 and the clock is high (level-triggered), the output toggles continuously as long as the clock stays high. Solved by edge-triggering or Master-Slave configuration.',hint:'Think about what happens when clock stays HIGH for a long time'}],
            [{question:'How many flip-flops are needed for a Mod-10 counter?',options:['3','4','5','10'],answer:1,explanation:'A Mod-N counter needs ⌈log₂(N)⌉ flip-flops. For Mod-10: ⌈log₂(10)⌉ = 4 flip-flops.'}],
            [{type:'warning',content:'SR flip-flop has an invalid state when S=R=1. JK flip-flop solves this by toggling instead.'}],
            [{title:'Mod-5 Counter Design',problem:'Design a Mod-5 counter using JK flip-flops.',solution:'Need 3 JK flip-flops (2³=8 ≥ 5). Count 0-4 (000 to 100) then reset. Use NAND gate to detect state 101 (binary 5) and clear all flip-flops. When count reaches 5 (101), NAND(Q0, Q2) = 0 triggers CLR on all FFs, resetting to 000.',explanation:'This is a ripple counter with asynchronous clear. The counter counts 0,1,2,3,4,0,1,... — a Mod-5 counter.'}],
            [{marks:3,question:'Explain the difference between synchronous and asynchronous counters.',modelAnswer:'Asynchronous (ripple) counters have each flip-flop clocked by the previous flip-flop output — simple but slow due to ripple delay. Synchronous counters have all flip-flops share the same clock — faster but requires more logic gates.'}],
            ['For Mod-N counter, use ⌈log₂(N)⌉ flip-flops', 'D flip-flop is the most commonly used in digital design'],
            ['Forgetting that JK flip-flop when J=K=1 TOGGLES (not invalid like SR)']
          ),
        ]
      },
      {
        number: 3, title: 'Microcontroller Architecture', weightage: 25,
        lessons: [
          makeLesson('8051-architecture', '8051 Microcontroller Architecture', 20, 'hard',
            'The 8051 is an 8-bit microcontroller with a simple but powerful architecture. This lesson covers its CPU, memory organization, I/O ports, and special function registers.',
            '## Introduction\n\nThe 8051 microcontroller, introduced by Intel in 1980, is one of the most popular microcontrollers. It is an 8-bit microcontroller with 4KB of ROM, 128 bytes of RAM, 4 I/O ports, 2 timers, and 1 serial port.\n\n## Architecture\n\n### CPU\n- 8-bit ALU (Arithmetic Logic Unit)\n- Program Counter (PC): 16-bit, addresses up to 64KB\n- Accumulator (A): 8-bit, used for all arithmetic and logic operations\n- B register: 8-bit, used in multiplication and division\n- PSW (Program Status Word): Contains flags (CY, AC, OV, P, F0, F1, RS0, RS1)\n\n### Memory Organization\n- **Harvard Architecture**: Separate program memory and data memory\n- **Program Memory (ROM)**: 4KB internal, expandable to 64KB external\n- **Data Memory (RAM)**: 128 bytes internal (00H-7FH), expandable to 64KB external\n- **Register Banks**: 4 banks of R0-R7 (8 bytes each) at 00H-1FH\n- **Bit-addressable RAM**: 16 bytes (20H-2FH) — 128 individually addressable bits\n- **SFR (Special Function Registers)**: 21 registers at 80H-FFH (Acc, B, PSW, P0-P3, TCON, TMOD, TH0, TL0, etc.)\n\n### I/O Ports\n- 4 ports × 8 pins = 32 I/O pins\n- Port 0: Multiplexed address/data bus (needs pull-up resistors)\n- Port 1: General purpose I/O\n- Port 2: High byte of external address bus\n- Port 3: Special functions (RXD, TXD, INT0, INT1, T0, T1, WR, RD)\n\n### Timers\n- Two 16-bit timers (Timer 0 and Timer 1)\n- Modes: 13-bit, 16-bit, 8-bit auto-reload, split timer\n\n### Serial Port\n- Full duplex UART\n- 4 modes of operation',
            ['8051 is 8-bit Harvard architecture microcontroller', '4KB ROM, 128 bytes RAM, 4 I/O ports (32 pins)', '4 register banks (R0-R7) at 00H-1FH, selected by PSW bits RS0/RS1', 'SFRs at 80H-FFH: Acc, B, PSW, P0-P3, TCON, TMOD, etc.', 'Port 0 needs external pull-ups, Port 3 has special functions (RXD, TXD, INT0, INT1)'],
            [{front:'What is the difference between microprocessor and microcontroller?',back:'Microprocessor has only CPU on a single chip (needs external RAM, ROM, I/O). Microcontroller has CPU + RAM + ROM + I/O + timers all on a single chip.',hint:'Think: all-in-one vs just-the-brain'}],
            [{question:'How many register banks are available in 8051?',options:['2','4','8','16'],answer:1,explanation:'8051 has 4 register banks (Bank 0-3), each containing R0-R7 (8 registers). Banks are at addresses 00H-1FH. Selected by RS0 and RS1 bits in PSW.'}],
            [{type:'note',content:'8051 uses Harvard architecture — program memory and data memory are separate, allowing simultaneous access.'}],
            [{title:'Calculate Timer Delay',problem:'Calculate the delay generated by Timer 0 in Mode 1 (16-bit) with TH0=0, TL0=0 if the crystal frequency is 11.0592 MHz.',solution:'Machine cycle = 12 / 11.0592 MHz = 1.085 µs. Timer counts 65536 (0000 to FFFF) machine cycles. Delay = 65536 × 1.085 µs = 71.1 ms.',explanation:'In Mode 1, the timer is 16-bit. Starting from 0000H, it counts up to FFFFH (65536 counts) before overflowing. Each count takes 1 machine cycle = 12 clock periods.'}],
            [{marks:3,question:'Explain the memory organization of 8051 microcontroller.',modelAnswer:'8051 has Harvard architecture with separate program and data memory. Internal RAM (128 bytes) is divided into: Register Banks (00H-1FH: 4 banks of R0-R7), Bit-addressable RAM (20H-2FH: 128 bits), and General purpose RAM (30H-7FH). SFRs occupy 80H-FFH (Acc, B, PSW, P0-P3, TCON, TMOD, etc.). Program memory is 4KB internal ROM, expandable to 64KB.'}],
            ['Remember: 8051 machine cycle = 12 clock periods', 'PSW register contains flags: CY (carry), AC (aux carry), OV (overflow), P (parity)'],
            ['Confusing ROM (program memory) with RAM (data memory) — 8051 has Harvard architecture, they are separate']
          ),
        ]
      },
    ]
  },

  'R23CI2604': {
    name: 'Internet of Things and Applications (IoTA)',
    semester: 3,
    credits: 3,
    units: [
      {
        number: 1, title: 'IoT Fundamentals', weightage: 20,
        lessons: [
          makeLesson('iot-introduction', 'Introduction to IoT', 15, 'easy',
            'The Internet of Things (IoT) connects physical devices to the internet to collect, exchange, and act on data. This lesson covers IoT definition, architecture, applications, and enabling technologies.',
            '## What is IoT?\n\nThe Internet of Things (IoT) is a network of physical objects ("things") embedded with sensors, software, and connectivity that enables them to collect and exchange data over the internet.\n\n## IoT Architecture (4 Layers)\n\n1. **Sensing Layer**: Sensors and actuators that collect data from the physical world. Examples: temperature sensor, motion detector, GPS.\n\n2. **Network Layer**: Connects devices to the internet using Wi-Fi, Bluetooth, Zigbee, LoRa, cellular (4G/5G). Gateways aggregate data from multiple sensors.\n\n3. **Data Processing Layer**: Processes and analyzes the collected data. Uses cloud computing, edge computing, or fog computing. Includes data storage, analytics, and machine learning.\n\n4. **Application Layer**: Delivers services to users. Examples: smart home, industrial monitoring, healthcare, agriculture.\n\n## IoT Enabling Technologies\n- **Wireless Sensor Networks (WSN)**: Self-organizing networks of sensors\n- **Cloud Computing**: On-demand computing resources over the internet\n- **Big Data Analytics**: Processing massive volumes of IoT data\n- **Machine Learning**: Pattern recognition and predictive analytics\n- **Embedded Systems**: Small computers inside IoT devices\n\n## Real-World Applications\n- **Smart Home**: Thermostat, lights, security cameras controlled remotely\n- **Smart City**: Traffic management, waste management, air quality monitoring\n- **Healthcare**: Remote patient monitoring, wearable health devices\n- **Agriculture**: Soil moisture sensors, automated irrigation, crop monitoring\n- **Industrial IoT (IIoT)**: Predictive maintenance, supply chain tracking',
            ['IoT: Network of physical objects with sensors + connectivity that exchange data', '4-layer architecture: Sensing → Network → Data Processing → Application', 'Sensors collect data, actuators act on the physical world', 'Communication protocols: Wi-Fi, Bluetooth, Zigbee, LoRa, 4G/5G', 'Applications: smart home, smart city, healthcare, agriculture, IIoT'],
            [{front:'What are the four layers of IoT architecture?',back:'1. Sensing Layer (sensors/actuators) 2. Network Layer (connectivity) 3. Data Processing Layer (cloud/edge) 4. Application Layer (services)',hint:'Think: collect → connect → process → serve'}],
            [{question:'Which IoT layer contains sensors and actuators?',options:['Application','Network','Sensing','Data Processing'],answer:2,explanation:'The Sensing Layer contains sensors (which collect data) and actuators (which act on the physical world).'}],
            [{type:'example',content:'Smart thermostat (Nest): Temperature sensor (sensing) → Wi-Fi (network) → Cloud analytics (processing) → Mobile app (application). This is a complete 4-layer IoT system.'}],
            [{title:'IoT Smart Agriculture System',problem:'Design an IoT system for smart agriculture.',solution:'Sensors: Soil moisture, temperature, humidity, pH. Communication: LoRa (long range, low power). Processing: Cloud-based crop analytics. Application: Mobile app showing real-time data + automated irrigation control. When soil moisture < threshold, automatically trigger irrigation.',explanation:'LoRa is chosen for its long range (up to 15km in rural areas) and low power consumption, ideal for large farms.'}],
            [{marks:2,question:'What is the difference between sensor and actuator?',modelAnswer:'A sensor collects data from the physical world (input device — e.g., temperature sensor reads temperature). An actuator acts on the physical world (output device — e.g., motor turns, valve opens). Sensors sense, actuators act.'}],
            ['Memorize the 4-layer IoT architecture — it appears in every exam', 'Remember: sensor = input (reads), actuator = output (acts)'],
            ['Confusing IoT with Internet — IoT specifically connects physical objects/things, not just computers']
          ),
        ]
      },
      {
        number: 2, title: 'IoT Protocols and Communication', weightage: 25,
        lessons: [
          makeLesson('iot-protocols', 'IoT Communication Protocols', 18, 'medium',
            'IoT devices use various communication protocols to exchange data. This lesson covers MQTT, CoAP, HTTP, WebSocket, and short-range protocols like Wi-Fi, Bluetooth, Zigbee, and LoRa.',
            '## IoT Protocol Layers\n\n### Application Layer Protocols\n1. **MQTT (Message Queuing Telemetry Transport)**: Lightweight publish/subscribe protocol. Uses a broker. Ideal for low-bandwidth, unreliable networks. Port 1883 (TCP).\n   - Topics: hierarchical (e.g., home/livingroom/temperature)\n   - QoS levels: 0 (at most once), 1 (at least once), 2 (exactly once)\n\n2. **CoAP (Constrained Application Protocol)**: RESTful protocol for constrained devices. Uses UDP. Similar to HTTP but lightweight. Port 5683.\n\n3. **HTTP**: Standard web protocol. Heavier than MQTT/CoAP but widely supported.\n\n### Network/Transport Layer\n- **TCP**: Reliable, connection-oriented. Used by MQTT, HTTP.\n- **UDP**: Fast, connectionless. Used by CoAP.\n\n### Physical/Data Link Layer\n1. **Wi-Fi (802.11)**: High speed, high power. Range: ~100m. Good for home/office IoT.\n2. **Bluetooth/BLE**: Short range (~10m), low power. BLE is ideal for wearables.\n3. **Zigbee (802.15.4)**: Low power, mesh network. Range: ~100m. Used in smart home.\n4. **LoRa (Long Range)**: Long range (2-15km), low power, low data rate. Ideal for agriculture/industrial IoT.\n5. **Cellular (4G/5G/NB-IoT)**: Wide area coverage. Higher power but ubiquitous.\n\n## Protocol Selection Criteria\n- **Range**: Wi-Fi (100m) < Zigbee (100m) < LoRa (15km) < Cellular (10km+)\n- **Power**: BLE < LoRa < Zigbee < Wi-Fi\n- **Data rate**: LoRa (kbps) < BLE (1Mbps) < Zigbee (250kbps) < Wi-Fi (100Mbps+)',
            ['MQTT: Publish/subscribe, lightweight, uses broker. QoS 0/1/2. Port 1883', 'CoAP: RESTful for constrained devices, uses UDP. Port 5683', 'Wi-Fi: High speed, high power, ~100m range', 'Zigbee: Low power, mesh network, ~100m. Smart home standard', 'LoRa: Long range (2-15km), low power, low data rate. Agriculture/industrial'],
            [{front:'Why is MQTT preferred over HTTP for IoT?',back:'MQTT is lighter (smaller header), uses publish/subscribe (efficient for many devices), supports QoS levels, and works better on unreliable networks. HTTP is heavier and request/response (less efficient for IoT).',hint:'Think about header size and communication pattern'}],
            [{question:'Which protocol is best for a smart agriculture system covering 10km?',options:['Wi-Fi','Bluetooth','LoRa','Zigbee'],answer:2,explanation:'LoRa has a range of 2-15km with low power consumption, making it ideal for large-scale agriculture IoT.'}],
            [{type:'tip',content:'MQTT uses publish/subscribe pattern — devices publish to topics, subscribers receive messages on topics they subscribe to. This decouples sender and receiver.'}],
            [{title:'MQTT Smart Home System',problem:'Design a smart home lighting system using MQTT.',solution:'Broker: Mosquitto on Raspberry Pi. Topics: home/livingroom/light (status), home/livingroom/light/set (command). Publisher: Mobile app publishes "ON" to home/livingroom/light/set. Subscriber: ESP8266 with relay subscribes to home/livingroom/light/set, turns relay ON. ESP8266 publishes "ON" to home/livingroom/light (status confirmation).',explanation:'Publish/subscribe decouples the app from the device. The app does not need to know the device IP — it just publishes to a topic.'}],
            [{marks:3,question:'Compare MQTT and CoAP for IoT applications.',modelAnswer:'MQTT: TCP-based, publish/subscribe, broker architecture, higher overhead but reliable. Good for many-to-many communication. CoAP: UDP-based, request/response (like HTTP), lighter, supports multicast. Good for constrained devices with direct communication. MQTT is better for large-scale deployments with many devices; CoAP is better for resource-constrained device-to-device communication.'}],
            ['Remember: MQTT = TCP (reliable), CoAP = UDP (fast but unreliable)', 'LoRa = Long Range — the name tells you the key feature'],
            ['Confusing publish/subscribe with request/response — MQTT is pub/sub, HTTP is req/res']
          ),
        ]
      },
    ]
  },

  'R23CI2609': {
    name: 'Internet of Things Architecture and Protocols (IoTAP)',
    semester: 5,
    credits: 3,
    units: [
      {
        number: 1, title: 'IoT Architecture Models', weightage: 20,
        lessons: [
          makeLesson('iot-architecture-models', 'IoT Architecture Models', 18, 'medium',
            'IoT architecture defines how devices, networks, and applications are organized. This lesson covers the 4-layer, 5-layer, 7-layer (IoT-A), and SOA-based IoT architectures.',
            '## IoT Architecture Models\n\n### 1. Basic 4-Layer Architecture\n1. **Sensing Layer**: Sensors and actuators\n2. **Network Layer**: Gateways, communication protocols\n3. **Service Layer**: Data processing, storage, analytics\n4. **Interface Layer**: User applications, dashboards\n\n### 2. 5-Layer Architecture (Extended)\n1. **Perception Layer**: Physical sensors/actuators\n2. **Network Layer**: Data transmission\n3. **Processing Layer**: Cloud/edge computing\n4. **Application Layer**: Business logic\n5. **Business Layer**: Analytics, reporting, management\n\n### 3. IoT-A Reference Architecture\nThe European IoT-A project defines a 7-layer model:\n1. Physical Device Layer\n2. Communication Layer\n3. IoT Service Layer\n4. Virtual Entity Layer\n5. IoT Process Management Layer\n6. Application Layer\n7. Business Layer\n\n### 4. SOA (Service-Oriented Architecture) for IoT\nDivides IoT into 4 service layers:\n1. **Sensing Layer**: Data acquisition\n2. **Access Layer**: Data aggregation and filtering\n3. **Middleware Layer**: Service management, data storage\n4. **Application Layer**: End-user services\n\n## Edge vs Cloud Computing in IoT\n- **Edge Computing**: Process data near the source (on gateway/device). Reduces latency, saves bandwidth.\n- **Cloud Computing**: Process data in centralized cloud. More computing power, historical analysis.\n- **Fog Computing**: Intermediate layer between edge and cloud.',
            ['4-layer: Sensing → Network → Service → Interface', '5-layer adds Business Layer for analytics/management', 'IoT-A: 7-layer European reference model (most detailed)', 'Edge computing: Process near source (low latency, saves bandwidth)', 'Fog computing: Intermediate between edge and cloud'],
            [{front:'What is edge computing in IoT?',back:'Edge computing processes data near the source (on gateway or device) instead of sending everything to the cloud. Benefits: lower latency, reduced bandwidth, works offline.',hint:'Think: where does processing happen?'}],
            [{question:'Which computing model processes data near the data source?',options:['Cloud computing','Edge computing','Grid computing','Quantum computing'],answer:1,explanation:'Edge computing processes data at or near the source (device/gateway), reducing latency and bandwidth usage compared to cloud computing.'}],
            [{type:'note',content:'Fog computing (coined by Cisco) is an intermediate layer between edge and cloud — it processes data at the network edge but with more computing power than individual devices.'}],
            [{title:'Smart Traffic Management Architecture',problem:'Design a 5-layer IoT architecture for smart traffic management.',solution:'Perception: Traffic sensors, cameras at intersections. Network: 4G/5G to send data. Processing: Edge gateway analyzes video for vehicle count. Application: Adaptive traffic light control. Business: City-wide traffic analytics dashboard.',explanation:'Edge processing is critical here — video analysis must happen locally (low latency) rather than sending raw video to the cloud.'}],
            [{marks:3,question:'Explain the need for edge computing in IoT.',modelAnswer:'Edge computing processes data near the source instead of the cloud. Benefits: (1) Low latency — critical for real-time applications like autonomous vehicles. (2) Bandwidth efficiency — reduces data sent to cloud. (3) Offline capability — works without internet. (4) Privacy — sensitive data stays local. (5) Cost — reduces cloud computing costs.'}],
            ['Edge = near source (low latency). Cloud = centralized (high power). Fog = in between', 'IoT-A 7-layer is the most comprehensive reference model'],
            ['Confusing edge with fog — edge is ON the device/gateway, fog is a separate intermediate layer']
          ),
        ]
      },
    ]
  },

  'R23CI2611': {
    name: 'Wireless Ad-Hoc Network',
    semester: 5,
    credits: 2,
    units: [
      {
        number: 1, title: 'Ad-Hoc Network Fundamentals', weightage: 20,
        lessons: [
          makeLesson('manet-basics', 'Mobile Ad-Hoc Networks (MANET)', 18, 'medium',
            'A Mobile Ad-Hoc Network (MANET) is a self-configuring network of mobile devices connected without infrastructure. This lesson covers MANET characteristics, routing protocols, and applications.',
            '## What is a MANET?\n\nA Mobile Ad-Hoc Network (MANET) is a collection of wireless mobile nodes that dynamically form a temporary network without the need for any pre-existing infrastructure (no routers, no access points).\n\n## Characteristics\n- **No fixed infrastructure**: Nodes themselves act as routers\n- **Dynamic topology**: Nodes move freely, changing network topology\n- **Multi-hop routing**: Data may pass through multiple intermediate nodes\n- **Self-configuring**: Nodes automatically join/leave the network\n- **Energy constrained**: Typically battery-powered devices\n- **Limited bandwidth**: Wireless communication\n\n## Types of Ad-Hoc Networks\n1. **MANET (Mobile Ad-Hoc Network)**: Mobile nodes, vehicular\n2. **WSN (Wireless Sensor Network)**: Stationary sensors, low power\n3. **VANET (Vehicular Ad-Hoc Network)**: Vehicles, high mobility\n4. **FANET (Flying Ad-Hoc Network)**: UAVs/drones\n\n## Routing Protocols\n\n### Proactive (Table-Driven)\n- Nodes maintain routing tables with routes to ALL nodes\n- Updates propagated when topology changes\n- Examples: DSDV, OLSR, DREAM\n- **Pros**: Low latency (routes pre-computed)\n- **Cons**: High overhead (control messages)\n\n### Reactive (On-Demand)\n- Routes discovered only when needed\n- Route discovery: flood network with RREQ\n- Examples: AODV, DSR, TORA\n- **Pros**: Low overhead (only when needed)\n- **Cons**: High latency for first packet\n\n### Hybrid\n- Combines proactive and reactive\n- Examples: ZRP (Zone Routing Protocol)\n- Proactive within zone, reactive outside zone',
            ['MANET: Self-configuring network of mobile nodes, no infrastructure', 'Nodes act as both hosts AND routers (multi-hop)', 'Proactive routing: Pre-compute all routes (DSDV, OLSR) — low latency, high overhead', 'Reactive routing: Discover routes on demand (AODV, DSR) — low overhead, high latency', 'VANET: Vehicles, FANET: Drones, WSN: Sensors — all are ad-hoc network types'],
            [{front:'What is the difference between proactive and reactive routing in MANET?',back:'Proactive (table-driven): Maintains routes to ALL nodes at all times (DSDV, OLSR). Low latency, high overhead. Reactive (on-demand): Discovers routes only when needed (AODV, DSR). Low overhead, higher latency for first packet.',hint:'Think: pre-computed vs on-demand'}],
            [{question:'Which routing protocol discovers routes only when needed?',options:['DSDV','OLSR','AODV','DREAM'],answer:2,explanation:'AODV (Ad-Hoc On-Demand Distance Vector) is a reactive protocol — it discovers routes only when a node needs to send data, using Route Request (RREQ) messages.'}],
            [{type:'example',content:'Military battlefield: Soldiers with mobile devices form a MANET. No cell towers available. Each soldier device acts as a router, relaying messages to other soldiers through multiple hops.'}],
            [{title:'AODV Route Discovery',problem:'Explain how AODV discovers a route from node A to node E in a 5-node network (A-B-C-D-E).',solution:'1. A broadcasts RREQ (Route Request) to neighbors B. 2. B forwards RREQ to C. 3. C forwards to D. 4. D forwards to E. 5. E recognizes itself as destination, sends RREP (Route Reply) back via D→C→B→A. 6. A now has route: A→B→C→D→E. Reverse path established during RREP.',explanation:'AODV uses broadcast for route discovery (RREQ) and unicast for route reply (RREP). The reverse path is established because each node records who sent the RREQ.'}],
            [{marks:3,question:'Explain the challenges of routing in MANET.',modelAnswer:'MANET routing challenges: (1) Dynamic topology — nodes move, routes break frequently. (2) Limited bandwidth — wireless links have lower capacity. (3) Energy constrained — battery-powered nodes, routing must be energy-efficient. (4) No central control — distributed algorithms needed. (5) Security — wireless medium is vulnerable to attacks. (6) Hidden terminal problem — nodes out of range cause collisions.'}],
            ['AODV = Ad-Hoc On-Demand Distance Vector — the name tells you: on-demand (reactive)', 'In MANET, every node is both a host AND a router'],
            ['Confusing MANET with WLAN — WLAN has access points (infrastructure), MANET has none']
          ),
        ]
      },
    ]
  },

  'R23CI2612': {
    name: 'Iot In Robotics',
    semester: 5,
    credits: 4,
    units: [
      {
        number: 1, title: 'IoT-Enabled Robotics', weightage: 30,
        lessons: [
          makeLesson('iot-robotics-integration', 'IoT and Robotics Integration', 18, 'medium',
            'IoT-enabled robotics combines Internet of Things with robotics to create cloud-connected robots that share data, learn collaboratively, and operate remotely.',
            '## IoT in Robotics\n\nIoT-enabled robotics (also called Cloud Robotics or Internet of Robotics Things — IoRT) combines IoT sensors, cloud computing, and robotic systems to create intelligent, connected robots.\n\n## Architecture\n1. **Robot Layer**: Physical robots with sensors, actuators, microcontrollers\n2. **Communication Layer**: Wi-Fi, 5G, Bluetooth for robot-to-cloud communication\n3. **Cloud Layer**: Data storage, ML training, path planning, fleet management\n4. **Application Layer**: Remote monitoring, control dashboard, analytics\n\n## Benefits of IoT in Robotics\n- **Cloud Computing**: Offload heavy computation (ML, path planning) to cloud\n- **Fleet Management**: Monitor and coordinate multiple robots\n- **Collaborative Learning**: Robots share experiences to learn faster\n- **Remote Control**: Operate robots from anywhere via internet\n- **Predictive Maintenance**: Sensor data predicts robot failures\n\n## Applications\n- **Industrial**: Smart factory robots with real-time monitoring\n- **Healthcare**: Telemedicine robots, surgical robots\n- **Agriculture**: Autonomous tractors, harvesting robots\n- **Logistics**: Warehouse robots (Amazon Kiva), delivery drones\n- **Home**: Vacuum robots (Roomba) with smartphone control\n\n## Key Technologies\n- **ROS (Robot Operating System)**: Open-source robotics framework\n- **MQTT**: Lightweight protocol for robot-to-cloud communication\n- **Computer Vision**: Object detection, navigation\n- **SLAM**: Simultaneous Localization and Mapping\n- **5G**: Ultra-low latency for real-time robot control',
            ['IoRT (Internet of Robotics Things): IoT + Robotics = cloud-connected robots', 'Cloud robotics offloads heavy computation to cloud — robots can be smaller/lighter', 'Fleet management: Monitor and coordinate multiple robots centrally', 'ROS (Robot Operating System): Open-source framework for robot software', '5G enables real-time remote robot control with ultra-low latency'],
            [{front:'What is cloud robotics?',back:'Cloud robotics uses cloud computing to offload heavy computation (ML, path planning, data processing) from robots to the cloud. Benefits: robots can be smaller, cheaper, and access unlimited computing power.',hint:'Think: where does the computation happen?'}],
            [{question:'What protocol is commonly used for robot-to-cloud communication?',options:['FTP','MQTT','SNMP','BGP'],answer:1,explanation:'MQTT is lightweight, uses publish/subscribe, and works well on unreliable networks — ideal for robot-to-cloud communication.'}],
            [{type:'example',content:'Amazon warehouse robots (Kiva/Amazon Robotics): Hundreds of robots move shelves to workers. IoT sensors track each robot position, cloud algorithms plan optimal paths to avoid collisions, and fleet management software coordinates all robots.'}],
            [{title:'IoT Robot Arm Monitoring',problem:'Design an IoT system for monitoring a factory robot arm.',solution:'Sensors: Joint angle encoders, motor current sensors, temperature, vibration. Communication: Wi-Fi to factory gateway. Cloud: AWS IoT Core with MQTT. Processing: Real-time anomaly detection (ML model), predictive maintenance (vibration analysis). Dashboard: Web app showing robot status, alerts for anomalies, maintenance schedule.',explanation:'Vibration analysis can detect bearing wear BEFORE failure — this is predictive maintenance, a key IoT robotics application.'}],
            [{marks:3,question:'Explain the benefits of integrating IoT with robotics.',modelAnswer:'IoT + Robotics benefits: (1) Cloud computing — offload heavy ML/path planning, robots can be smaller. (2) Fleet management — coordinate multiple robots. (3) Collaborative learning — robots share experiences to learn faster. (4) Remote monitoring/control — operate from anywhere. (5) Predictive maintenance — sensor data predicts failures before they happen. (6) Real-time data — continuous monitoring of robot health and performance.'}],
            ['ROS is not an OS — it is a framework for writing robot software', 'Cloud robotics = robot brain in the cloud, sensors/actuators on the robot'],
            ['Confusing ROS with a real OS (Linux) — ROS runs ON Linux, it is a middleware framework']
          ),
        ]
      },
    ]
  },

  'R23CI3601': {
    name: 'Cyber Security',
    semester: 5,
    credits: 2,
    units: [
      {
        number: 1, title: 'Cyber Security Fundamentals', weightage: 20,
        lessons: [
          makeLesson('cybersecurity-basics', 'Cyber Security Fundamentals', 15, 'easy',
            'Cyber security protects systems, networks, and data from digital attacks. This lesson covers the CIA triad, threat types, attack vectors, and defense mechanisms.',
            '## What is Cyber Security?\n\nCyber security is the practice of protecting systems, networks, and programs from digital attacks aimed at accessing, changing, or destroying sensitive information.\n\n## The CIA Triad\n\n1. **Confidentiality**: Information is accessible only to authorized users. Example: Encryption, access control.\n2. **Integrity**: Information is accurate and unaltered. Example: Hashing, digital signatures.\n3. **Availability**: Information is accessible when needed. Example: Redundancy, DDoS protection.\n\n## Types of Cyber Attacks\n\n1. **Malware**: Malicious software (virus, worm, trojan, ransomware, spyware)\n2. **Phishing**: Fraudulent emails/websites that trick users into revealing credentials\n3. **Man-in-the-Middle (MITM)**: Attacker intercepts communication between two parties\n4. **SQL Injection**: Malicious SQL code inserted into input fields\n5. **DDoS (Distributed Denial of Service)**: Overwhelm a server with traffic from multiple sources\n6. **Social Engineering**: Manipulating people into revealing information\n7. **Zero-Day Attack**: Exploits unknown vulnerabilities before patches exist\n\n## Defense Mechanisms\n\n1. **Firewall**: Filters network traffic based on rules\n2. **Antivirus**: Detects and removes malware\n3. **Encryption**: Protects data confidentiality (AES, RSA)\n4. **Authentication**: Verifies identity (passwords, biometrics, MFA)\n5. **Intrusion Detection System (IDS)**: Monitors for suspicious activity\n6. **VPN**: Encrypts internet connection\n7. **Security Awareness Training**: Educate users about threats\n\n## Authentication vs Authorization\n- **Authentication**: Who are you? (verify identity — password, fingerprint)\n- **Authorization**: What can you do? (permissions — read, write, execute)',
            ['CIA Triad: Confidentiality (encryption), Integrity (hashing), Availability (redundancy)', 'Malware: Virus, worm, trojan, ransomware, spyware', 'Phishing: Fake emails/websites that steal credentials', 'DDoS: Overwhelm server with traffic from multiple sources', 'Authentication = who are you? Authorization = what can you do?'],
            [{front:'What is the CIA triad in cyber security?',back:'Confidentiality (data hidden from unauthorized users), Integrity (data not tampered with), Availability (data accessible when needed). These are the three pillars of information security.',hint:'C-I-A = three goals of security'}],
            [{question:'Which attack overwhelms a server with traffic from multiple sources?',options:['Phishing','DDoS','SQL Injection','MITM'],answer:1,explanation:'DDoS (Distributed Denial of Service) uses multiple compromised systems (botnet) to flood a target server with traffic, making it unavailable to legitimate users.'}],
            [{type:'warning',content:'Ransomware (like WannaCry) encrypts your files and demands payment. Always maintain offline backups — paying the ransom does not guarantee file recovery.'}],
            [{title:'SQL Injection Prevention',problem:'A login form uses: SELECT * FROM users WHERE username="${user}" AND password="${pass}". How can this be exploited and prevented?',solution:'Exploit: Enter username as admin" OR "1"="1 — the query becomes SELECT * FROM users WHERE username="admin" OR "1"="1" -- which is always true, bypassing login. Prevention: Use parameterized queries (prepared statements) — never concatenate user input into SQL.',explanation:'Parameterized queries separate SQL code from user input, making injection impossible. In Node.js: db.query("SELECT * FROM users WHERE username=? AND password=?", [user, pass])'}],
            [{marks:3,question:'Explain the CIA triad with examples.',modelAnswer:'Confidentiality: Only authorized users can read data. Achieved by encryption (AES), access control (RBAC), MFA. Example: Password-protected file. Integrity: Data is not altered. Achieved by hashing (SHA-256), digital signatures. Example: Download checksum verification. Availability: Data is accessible when needed. Achieved by redundancy, backups, DDoS protection. Example: 99.9% uptime SLA.'}],
            ['Remember CIA: Confidentiality, Integrity, Availability — the three pillars', 'Authentication = identity (who), Authorization = permissions (what)'],
            ['Confusing authentication with authorization — authentication verifies WHO you are, authorization decides WHAT you can do']
          ),
        ]
      },
    ]
  },

  'R23CI4603': {
    name: 'Problem-Solving and Ethics',
    semester: 4,
    credits: 2,
    units: [
      {
        number: 1, title: 'Problem-Solving Techniques', weightage: 25,
        lessons: [
          makeLesson('problem-solving-approaches', 'Problem-Solving Approaches', 15, 'easy',
            'Problem-solving is the process of finding solutions to difficult or complex issues. This lesson covers structured problem-solving techniques, algorithms, and ethical considerations.',
            '## What is Problem-Solving?\n\nProblem-solving is the process of identifying a problem, analyzing it, developing a solution, and evaluating the results.\n\n## Problem-Solving Steps\n1. **Understand the Problem**: Define the problem clearly\n2. **Plan a Solution**: Develop an algorithm or strategy\n3. **Execute the Plan**: Implement the solution\n4. **Evaluate the Result**: Verify the solution works\n\n## Problem-Solving Techniques\n\n1. **Divide and Conquer**: Break large problems into smaller sub-problems. Example: Merge sort.\n2. **Greedy Approach**: Make locally optimal choices at each step. Example: Dijkstra algorithm.\n3. **Dynamic Programming**: Break into overlapping sub-problems, store results. Example: Fibonacci.\n4. **Backtracking**: Try solutions, backtrack on failure. Example: N-Queens.\n5. **Brute Force**: Try all possibilities. Example: Linear search.\n\n## Ethics in Engineering\n\n### Ethical Principles\n1. **Honesty**: Do not falsify data or results\n2. **Integrity**: Act consistently with moral principles\n3. **Responsibility**: Be accountable for your work\n4. **Respect for Intellectual Property**: Do not plagiarize\n5. **Privacy**: Protect user data\n6. **Safety**: Ensure products do not harm users\n\n### Ethical Dilemmas in Technology\n- **AI Bias**: Ensuring AI systems are fair and unbiased\n- **Data Privacy**: Balancing data collection with user privacy\n- **Autonomous Systems**: Who is responsible when AI makes errors?\n- **Open Source vs Proprietary**: Sharing knowledge vs protecting IP\n\n### Professional Ethics Codes\n- **ACM Code of Ethics**: Association for Computing Machinery\n- **IEEE Code of Ethics**: Institute of Electrical and Electronics Engineers\n- **ACM/IEEE Software Engineering Code of Ethics**',
            ['Problem-solving steps: Understand → Plan → Execute → Evaluate', 'Divide and Conquer: Break large problems into smaller sub-problems', 'Dynamic Programming: Overlapping sub-problems + memoization', 'Engineering ethics: Honesty, integrity, responsibility, privacy, safety', 'ACM and IEEE have professional codes of ethics for engineers'],
            [{front:'What is the divide and conquer problem-solving technique?',back:'Divide: Break the problem into smaller sub-problems. Conquer: Solve each sub-problem recursively. Combine: Merge the solutions. Example: Merge sort divides array, sorts halves, merges.',hint:'Think: split → solve → merge'}],
            [{question:'Which problem-solving technique stores results of sub-problems to avoid recomputation?',options:['Greedy','Brute Force','Dynamic Programming','Backtracking'],answer:2,explanation:'Dynamic Programming stores results of overlapping sub-problems (memoization/tabulation) to avoid recomputation. Example: Fibonacci with memoization reduces from O(2^n) to O(n).'}],
            [{type:'note',content:'Professional ethics codes (ACM, IEEE) are not laws but professional standards. Violating them can result in losing certification or membership, but not jail time (unless laws are also broken).'}],
            [{title:'Ethical Dilemma: Autonomous Vehicle',problem:'An autonomous vehicle must choose between hitting a pedestrian or swerving into a wall (killing the passenger). What ethical framework applies?',solution:'This is the "Trolley Problem" applied to AI. Utilitarian approach: Minimize total harm (1 death vs 1 death — equal). Deontological approach: The car should not actively kill (swerving is an action, hitting pedestrian is also an action). In practice: Manufacturers should prioritize not hitting pedestrians (who are unprotected) over passengers (who have airbags).',explanation:'This is an unsolved ethical dilemma. The key is TRANSPARENCY — manufacturers must disclose how their AI makes such decisions, and regulators must set standards.'}],
            [{marks:2,question:'What is the difference between dynamic programming and divide and conquer?',modelAnswer:'Divide and conquer breaks problems into INDEPENDENT sub-problems (e.g., merge sort — halves are sorted independently). Dynamic programming breaks problems into OVERLAPPING sub-problems and stores results to avoid recomputation (e.g., Fibonacci — fib(5) needs fib(4) and fib(3), but fib(4) also needs fib(3), so store fib(3) once).'}],
            ['Remember: DP = overlapping sub-problems + memoization. D&C = independent sub-problems', 'Ethics = doing the right thing even when no one is watching'],
            ['Confusing greedy with DP — greedy makes ONE choice and never revisits, DP considers ALL choices']
          ),
        ]
      },
    ]
  },

  'R23CI1605': {
    name: 'Seminar and Capstone Initiation',
    semester: 5,
    credits: 2,
    units: [
      {
        number: 1, title: 'Seminar and Project Initiation', weightage: 30,
        lessons: [
          makeLesson('seminar-presentation', 'Seminar Presentation Skills', 12, 'easy',
            'A seminar is an oral presentation on a technical topic. This lesson covers how to prepare, structure, and deliver an effective technical seminar.',
            '## What is a Seminar?\n\nA seminar is a form of academic instruction where a student presents a topic to an audience (classmates and faculty) followed by a discussion.\n\n## Seminar Structure\n\n1. **Title Slide**: Topic, name, roll number, guide name\n2. **Introduction**: Background, why the topic matters\n3. **Outline**: What you will cover (agenda)\n4. **Main Content**: 8-12 slides covering the topic\n5. **Applications**: Real-world uses\n6. **Advantages/Disadvantages**: Balanced view\n7. **Conclusion**: Summary and future scope\n8. **References**: Sources cited\n9. **Q&A**: Audience questions\n\n## Presentation Tips\n- **10-20-30 Rule**: 10 slides, 20 minutes, 30pt font minimum\n- **One idea per slide**: Do not cram\n- **Use visuals**: Diagrams, charts, images (not walls of text)\n- **Practice timing**: 1-2 minutes per slide\n- **Eye contact**: Look at audience, not slides\n- **Speak clearly**: Moderate pace, audible volume\n\n## Seminar Evaluation Criteria\n- Content depth and accuracy (30%)\n- Presentation skills (25%)\n- Slide quality (20%)\n- Q&A handling (15%)\n- Time management (10%)',
            ['Seminar: Oral presentation on a technical topic + Q&A', 'Structure: Title → Intro → Outline → Content → Applications → Conclusion → References', '10-20-30 rule: 10 slides, 20 minutes, 30pt font minimum', 'One idea per slide — use visuals, not walls of text', 'Evaluation: Content 30%, Presentation 25%, Slides 20%, Q&A 15%, Time 10%'],
            [{front:'What is the 10-20-30 rule for presentations?',back:'10 slides maximum, 20 minutes maximum, 30 point font minimum. Created by Guy Kawasaki to keep presentations concise and readable.',hint:'Think: 10, 20, 30'}],
            [{question:'What percentage of seminar evaluation is typically for presentation skills?',options:['10%','15%','25%','50%'],answer:2,explanation:'Presentation skills typically carry 25% of the evaluation weight — includes eye contact, clarity, confidence, and engagement.'}],
            [{type:'tip',content:'Practice your seminar at least 3 times before the actual presentation. Time yourself — going over time is worse than going under.'}],
            [{title:'IoT Seminar Structure',problem:'Structure a 15-minute seminar on "IoT in Healthcare".',solution:'1. Title (30s) 2. Introduction: What is IoT + healthcare context (2min) 3. Architecture: 4-layer IoT in healthcare (3min) 4. Applications: Remote monitoring, smart hospitals, wearables (4min) 5. Case study: Remote patient monitoring system (2min) 6. Challenges: Privacy, security, reliability (2min) 7. Conclusion + Future scope (1min) 8. Q&A (remaining time)',explanation:'15 minutes ÷ 8 sections = ~2 min per section. The case study makes the seminar practical and interesting.'}],
            [{marks:2,question:'What are the key elements of an effective technical seminar?',modelAnswer:'Key elements: (1) Clear structure (intro → content → conclusion) (2) Visual slides with minimal text (3) Practice and timing (4) Eye contact with audience (5) Clear, audible speech (6) Good Q&A handling — admit if you do not know, do not make up answers (7) Time management (8) Confidence and body language.'}],
            ['Practice 3+ times — going over time loses marks', 'One idea per slide — use visuals, not text walls'],
            ['Reading from slides — the audience can read faster than you can speak. Use slides as cues, not scripts']
          ),
          makeLesson('capstone-project', 'Capstone Project Initiation', 12, 'easy',
            'A capstone project is a final-year project that demonstrates the knowledge and skills acquired during the diploma program. This lesson covers project selection, planning, and execution.',
            '## What is a Capstone Project?\n\nA capstone project is a multifaceted assignment that serves as a culminating academic experience for students at the end of their diploma program. It integrates and applies the knowledge gained across multiple courses.\n\n## Project Selection\n\n### Criteria for Good Project\n1. **Feasible**: Can be completed in the given time with available resources\n2. **Relevant**: Related to your field of study\n3. **Innovative**: Solves a real problem in a new way\n4. **Scoped**: Not too simple, not too complex\n5. **Interesting**: You are motivated to work on it\n\n### Project Types\n1. **Application Development**: Web app, mobile app, desktop software\n2. **IoT System**: Sensor network + cloud + dashboard\n3. **AI/ML Project**: Prediction, classification, NLP\n4. **Hardware Project**: Embedded system, robotics\n5. **Research Project**: Survey + analysis on a topic\n\n## Project Planning\n\n### Project Proposal\n1. **Title**: Clear, concise, descriptive\n2. **Problem Statement**: What problem are you solving?\n3. **Objectives**: What will the project achieve?\n4. **Methodology**: How will you build it?\n5. **Timeline**: Gantt chart with milestones\n6. **Resources**: Hardware, software, data needed\n7. **Expected Outcomes**: What will be delivered?\n\n### Project Phases\n1. **Phase 1 (Week 1-4)**: Literature review, requirement analysis\n2. **Phase 2 (Week 5-8)**: Design, architecture\n3. **Phase 3 (Week 9-16)**: Implementation, testing\n4. **Phase 4 (Week 17-20)**: Documentation, presentation\n\n## Documentation\n- **Project Report**: 40-60 pages (IEEE format)\n- **Source Code**: Well-commented, on GitHub\n- **Presentation**: 15-20 slides\n- **Demo**: Working prototype demonstration',
            ['Capstone: Culminating project integrating all learning', 'Good project criteria: Feasible, Relevant, Innovative, Scoped, Interesting', 'Proposal: Title, Problem Statement, Objectives, Methodology, Timeline, Resources, Outcomes', '4 phases: Literature review → Design → Implementation → Documentation', 'Report: 40-60 pages IEEE format + source code + presentation + demo'],
            [{front:'What should a project proposal include?',back:'Title, Problem Statement (what problem), Objectives (what to achieve), Methodology (how to build), Timeline (Gantt chart), Resources (hardware/software/data), Expected Outcomes (deliverables).',hint:'Think: what, why, how, when, with what, what result'}],
            [{question:'What is the first phase of a capstone project?',options:['Implementation','Literature review','Testing','Documentation'],answer:1,explanation:'Phase 1 is literature review and requirement analysis — understanding what exists and what is needed before designing anything.'}],
            [{type:'important',content:'Choose a project you are genuinely interested in — you will spend 4-6 months on it. A boring project will lead to procrastination and poor results.'}],
            [{title:'IoT Smart Parking Capstone',problem:'Outline a capstone project for "IoT-Based Smart Parking System".',solution:'Problem: Finding parking in busy areas wastes time and fuel. Objectives: Detect available parking slots, display on mobile app, reserve slots. Methodology: IR sensors in each slot → ESP8266 → MQTT → Cloud → Mobile app. Timeline: 4 weeks research, 4 weeks design, 8 weeks implementation, 4 weeks documentation. Resources: 10 ESP8266, 10 IR sensors, Raspberry Pi (cloud), Android Studio. Outcomes: Working prototype + app + report.',explanation:'This project is feasible (common sensors), innovative (solves real problem), scoped (1 parking lot, not entire city), and interesting (IoT + mobile + cloud).'}],
            [{marks:2,question:'What criteria should you consider when selecting a capstone project?',modelAnswer:'1. Feasible — can be completed in given time with available resources. 2. Relevant — related to your field (computer/IoT engineering). 3. Innovative — solves a real problem in a new way. 4. Scoped — not too simple (trivial) or too complex (impossible). 5. Interesting — you are motivated to work on it for 4-6 months. 6. Cost — within your budget for hardware/software.'}],
            ['Choose a project you are interested in — you will spend 4-6 months on it', 'Document EVERYTHING from day 1 — writing the report at the end is 10x harder'],
            ['Choosing a project that is too ambitious — "I will build a self-driving car" is not feasible in 6 months with limited budget']
          ),
        ]
      },
    ]
  },
};

// Generate the files
let created = 0;
for (const [code, subject] of Object.entries(subjects)) {
  const filename = code.toLowerCase() + '-' + subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) + '.json';
  const data = {
    subjectCode: code,
    subjectName: subject.name,
    semester: subject.semester,
    credits: subject.credits,
    units: subject.units,
    revisionNotes: `Key concepts for ${subject.name}: See individual lesson summaries.`,
    interviewBank: [],
    vivaBank: [],
    pyqBank: [],
  };
  fs.writeFileSync(path.join(NOTES_DIR, filename), JSON.stringify(data, null, 2));
  created++;
  console.log('Created:', filename, '(' + subject.units.reduce((a,u)=>a+u.lessons.length,0) + ' lessons)');
}

console.log('\nTotal created:', created);
console.log('Total lesson-note JSONs now:', fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json')).length);
