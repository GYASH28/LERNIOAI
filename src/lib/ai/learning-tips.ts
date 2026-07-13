/**
 * Educational tips, science facts, programming jokes, and motivational
 * messages shown during AI streaming waits. Keeps the student engaged
 * and learning even while waiting.
 */

export type TipCategory = 'tip' | 'fact' | 'joke' | 'motivation'

export interface LearningTip {
  category: TipCategory
  text: string
  emoji?: string
}

export const LEARNING_TIPS: LearningTip[] = [
  // Study tips
  { category: 'tip', text: 'Teach a concept to someone else — if you can explain it simply, you truly understand it.', emoji: '💡' },
  { category: 'tip', text: 'The Feynman Technique: explain it like you\'re teaching a 12-year-old. Gaps in your explanation reveal what you don\'t know.', emoji: '💡' },
  { category: 'tip', text: 'Active recall beats re-reading. Close the book and write what you remember — that\'s where real learning happens.', emoji: '💡' },
  { category: 'tip', text: 'Spaced repetition: review after 1 day, then 3 days, then 7 days. Your brain strengthens memories each time.', emoji: '💡' },
  { category: 'tip', text: 'The Pomodoro Technique: 25 minutes focused study + 5 minute break. Your brain consolidates memory during rest.', emoji: '💡' },
  { category: 'tip', text: 'Interleaving: mix different topics in one session. It feels harder but builds stronger, more flexible understanding.', emoji: '💡' },
  { category: 'tip', text: 'Sleep after studying. Your brain replays and strengthens memories during deep sleep.', emoji: '💡' },
  { category: 'tip', text: 'Write notes by hand. The slower process forces your brain to summarize and understand, not just copy.', emoji: '💡' },
  { category: 'tip', text: 'Connect new knowledge to what you already know. Analogies make abstract concepts stick.', emoji: '💡' },
  { category: 'tip', text: 'Struggle is good. If it feels easy, you\'re probably not learning. Productive struggle builds understanding.', emoji: '💡' },
  { category: 'tip', text: 'Break big problems into smaller steps. "Divide and conquer" works for algorithms AND for studying.', emoji: '💡' },
  { category: 'tip', text: 'Review your mistakes. Every wrong answer teaches you more than ten right ones.', emoji: '💡' },

  // Science / CS facts
  { category: 'fact', text: 'The first computer bug was a real moth. In 1947, Grace Hopper found one trapped in a relay of the Harvard Mark II.', emoji: '🔬' },
  { category: 'fact', text: '1 byte = 8 bits. 1 KB ≈ 1000 bytes. 1 MB ≈ 1000 KB. 1 GB ≈ 1000 MB. 1 TB ≈ 1000 GB.', emoji: '🔬' },
  { category: 'fact', text: 'The term "algorithm" comes from Al-Khwarizmi, a 9th-century Persian mathematician who formalized algebra.', emoji: '🔬' },
  { category: 'fact', text: 'Linux runs on 96.3% of the top 1 million web servers, all Android phones, and the International Space Station.', emoji: '🔬' },
  { category: 'fact', text: 'The first message sent over the ARPANET (precursor to the internet) in 1969 was "LO" — the system crashed before "LOGIN" completed.', emoji: '🔬' },
  { category: 'fact', text: 'A CPU at 4 GHz switches 4 billion times per second. Light travels only 7.5 cm in that time.', emoji: '🔬' },
  { category: 'fact', text: 'RAM is volatile — it loses data when power is off. SSDs and HDDs are non-volatile — they keep data.', emoji: '🔬' },
  { category: 'fact', text: 'The average human brain has ~86 billion neurons and ~100 trillion synaptic connections.', emoji: '🔬' },
  { category: 'fact', text: 'Python is named after Monty Python\'s Flying Circus, not the snake. Guido van Rossum was reading the show\'s scripts.', emoji: '🔬' },
  { category: 'fact', text: 'The C programming language was created in 1972 by Dennis Ritchie at Bell Labs. C++, Java, and Python all trace back to it.', emoji: '🔬' },
  { category: 'fact', text: 'Binary search on 4 billion sorted items needs only 32 comparisons. That\'s why sorted data is powerful.', emoji: '🔬' },
  { category: 'fact', text: 'The first webcam was invented at Cambridge in 1991 to monitor a coffee pot — so people wouldn\'t walk to an empty pot.', emoji: '🔬' },

  // Programming jokes (clean, CS-themed)
  { category: 'joke', text: 'Why do programmers prefer dark mode? Because light attracts bugs. 🐛', emoji: '😄' },
  { category: 'joke', text: 'There are only 10 types of people in the world: those who understand binary and those who don\'t.', emoji: '😄' },
  { category: 'joke', text: 'Why did the developer go broke? Because they used up all their cache. 💸', emoji: '😄' },
  { category: 'joke', text: 'A SQL query walks into a bar, goes up to two tables and asks: "Can I join you?"', emoji: '😄' },
  { category: 'joke', text: 'Why do Java developers wear glasses? Because they don\'t C#. 👓', emoji: '😄' },
  { category: 'joke', text: 'How many programmers does it take to change a light bulb? None — that\'s a hardware problem.', emoji: '😄' },
  { category: 'joke', text: 'Debugging: being the detective in a crime movie where you are also the murderer.', emoji: '😄' },
  { category: 'joke', text: 'Why did the function return early? Because it forgot its parameter. 🏃', emoji: '😄' },
  { category: 'joke', text: 'A programmer\'s wife says: "Go to the store and buy a loaf of bread. If they have eggs, get a dozen." He comes home with 12 loaves of bread.', emoji: '😄' },
  { category: 'joke', text: 'Real programmers count from 0, not 1. So this is tip number 0... wait.', emoji: '😄' },

  // Motivation
  { category: 'motivation', text: 'Every expert was once a beginner. Every pro was once an amateur. Keep going.', emoji: '🌟' },
  { category: 'motivation', text: 'You don\'t have to be great to start, but you have to start to be great. — Zig Ziglar', emoji: '🌟' },
  { category: 'motivation', text: 'The only way to learn a new programming language is by writing programs in it. — Dennis Ritchie', emoji: '🌟' },
  { category: 'motivation', text: 'Code is like humor. When you have to explain it, it\'s bad. — Cory House', emoji: '🌟' },
  { category: 'motivation', text: 'First, solve the problem. Then, write the code. — John Johnson', emoji: '🌟' },
  { category: 'motivation', text: 'The best error message is the one that never shows up. — Thomas Fuchs', emoji: '🌟' },
  { category: 'motivation', text: 'Talk is cheap. Show me the code. — Linus Torvalds', emoji: '🌟' },
  { category: 'motivation', text: 'It always seems impossible until it\'s done. — Nelson Mandela', emoji: '🌟' },
  { category: 'motivation', text: 'Success is the sum of small efforts, repeated day in and day out. — Robert Collier', emoji: '🌟' },
  { category: 'motivation', text: 'The man who does not read has no advantage over the man who cannot read. — Mark Twain', emoji: '🌟' },
]

/** Get a random tip. Optionally filter by category. */
export function getRandomTip(category?: TipCategory): LearningTip {
  const pool = category ? LEARNING_TIPS.filter(t => t.category === category) : LEARNING_TIPS
  return pool[Math.floor(Math.random() * pool.length)] || LEARNING_TIPS[0]
}

/** Get N random tips (no repeats) for rotating display. */
export function getRandomTips(count: number, category?: TipCategory): LearningTip[] {
  const pool = category ? LEARNING_TIPS.filter(t => t.category === category) : LEARNING_TIPS
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** Format a tip for display. */
export function formatTip(tip: LearningTip): string {
  const prefix = tip.emoji ? `${tip.emoji} ` : ''
  return `${prefix}${tip.text}`
}
