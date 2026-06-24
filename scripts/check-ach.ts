import { db } from '../src/lib/db'
async function main() {
  const all = await db.achievement.findMany({ select: { key: true, name: true, category: true } })
  console.log(JSON.stringify(all, null, 2))
  console.log('TOTAL:', all.length)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
