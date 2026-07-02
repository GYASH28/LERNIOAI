/**
 * One-off script: upserts the extended achievement catalog into the DB.
 * Adds the new Phase 12 achievements (focus sessions, XP milestones, freezes,
 * quest mastery, streak 30) on top of the 12 existing seeded achievements.
 *
 * Safe to re-run — uses upsert keyed on the unique `key` field.
 *
 * Run with:  bunx tsx scripts/upsert-achievements.ts
 */
import { db } from '../src/lib/db'

interface AchDef {
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
}

const EXTENDED: AchDef[] = [
  // --- Learning (existing seeds cover first_lesson; add the rest) ---
  { key: 'lessons_5', name: 'Quick Study', description: 'Complete 5 lessons across any subject.', icon: 'BookOpen', category: 'learning', xpReward: 75 },
  { key: 'lessons_10', name: 'Scholar', description: 'Complete 10 lessons — you are building real depth.', icon: 'GraduationCap', category: 'learning', xpReward: 150 },
  // --- Practice ---
  { key: 'first_correct', name: 'Bullseye', description: 'Answer your first question correctly.', icon: 'Target', category: 'practice', xpReward: 25 },
  { key: 'correct_25', name: 'Sharpshooter', description: 'Get 25 questions correct.', icon: 'Crosshair', category: 'practice', xpReward: 100 },
  { key: 'correct_100', name: 'Centurion', description: 'Get 100 questions correct.', icon: 'Medal', category: 'practice', xpReward: 250 },
  { key: 'first_quiz', name: 'Quiz Rookie', description: 'Finish your first quiz.', icon: 'ClipboardCheck', category: 'practice', xpReward: 50 },
  { key: 'quiz_5', name: 'Quiz Veteran', description: 'Complete 5 quizzes.', icon: 'ClipboardList', category: 'practice', xpReward: 125 },
  // --- Revision ---
  { key: 'first_revision', name: 'Recaller', description: 'Complete your first spaced-repetition review.', icon: 'Repeat', category: 'revision', xpReward: 50 },
  { key: 'revision_10', name: 'Memory Keeper', description: 'Complete 10 spaced-repetition reviews.', icon: 'Brain', category: 'revision', xpReward: 100 },
  // --- Coding ---
  { key: 'first_code', name: 'Hello, C++', description: 'Pass your first Coding Lab challenge.', icon: 'Code2', category: 'coding', xpReward: 100 },
  // --- Consistency (existing seeds cover streak_3, streak_7) ---
  { key: 'streak_30', name: 'Unstoppable', description: 'Maintain a 30-day learning streak.', icon: 'Flame', category: 'consistency', xpReward: 500 },
  // --- Focus Sessions (NEW Phase 12) ---
  { key: 'focus_first', name: 'In The Zone', description: 'Complete your first Pomodoro Focus Timer session.', icon: 'Timer', category: 'consistency', xpReward: 50 },
  { key: 'focus_10', name: 'Focus Adept', description: 'Complete 10 focus timer sessions.', icon: 'Hourglass', category: 'consistency', xpReward: 150 },
  { key: 'focus_500_mins', name: 'Deep Worker', description: 'Accumulate 500 minutes of focused study time.', icon: 'Clock', category: 'consistency', xpReward: 300 },
  // --- XP Milestones (NEW Phase 12) ---
  { key: 'xp_200', name: 'Rising Star', description: 'Earn 200 XP.', icon: 'Star', category: 'learning', xpReward: 50 },
  { key: 'xp_500', name: 'XP Hunter', description: 'Earn 500 XP.', icon: 'Sparkles', category: 'learning', xpReward: 100 },
  { key: 'xp_1000', name: 'Grandmaster', description: 'Earn 1000 XP — you are in the top tier.', icon: 'Crown', category: 'learning', xpReward: 250 },
  // --- Streak Freeze (NEW Phase 12) ---
  { key: 'freeze_first', name: 'Frost Guardian', description: 'Use your first streak freeze to protect your streak.', icon: 'Snowflake', category: 'consistency', xpReward: 75 },
  // --- Daily Quest Mastery (NEW Phase 12) ---
  { key: 'quest_master_3', name: 'Quest Champion', description: 'Complete all daily quests 3 times.', icon: 'Trophy', category: 'consistency', xpReward: 150 },
  { key: 'quest_master_7', name: 'Quest Legend', description: 'Complete all daily quests 7 times — a full week of mastery.', icon: 'Award', category: 'consistency', xpReward: 350 },
]

async function main() {
  console.log(`\n🏆 Upserting ${EXTENDED.length} extended achievements...`)
  for (const a of EXTENDED) {
    await db.achievement.upsert({
      where: { key: a.key },
      update: { name: a.name, description: a.description, icon: a.icon, category: a.category, xpReward: a.xpReward },
      create: a,
    })
    console.log(`   ✓ ${a.key} — ${a.name}`)
  }
  const total = await db.achievement.count()
  console.log(`\n   Total achievements in catalog: ${total}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
