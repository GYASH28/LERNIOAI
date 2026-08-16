import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { generateStarterStudyPlan } from '@/lib/academics/planner-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getAcademicProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Complete academic onboarding first.' }, { status: 409 })

  let intensity: 'LIGHT' | 'BALANCED' | 'INTENSIVE' = 'BALANCED'
  try {
    const body = await request.json()
    if (body?.intensity === 'LIGHT' || body?.intensity === 'INTENSIVE') intensity = body.intensity
  } catch {}

  try {
    const plan = await generateStarterStudyPlan(user.id, profile, intensity)
    if (!plan) return NextResponse.json({ error: 'No published curriculum is available for this profile yet.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Academic study-plan generation failed', error)
    return NextResponse.json({ error: 'Could not generate your study plan.' }, { status: 500 })
  }
}
