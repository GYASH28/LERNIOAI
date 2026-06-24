import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MotionPageView } from './motion-page'
import { resolveMotionPolicy } from '@/lib/motion/policy'
import { getThemeMotion } from '@/lib/motion/theme-motion'

describe('MotionPageView', () => {
  it('uses theme motion attributes for animated navigation', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'full',
      osReducedMotion: false,
      lowPower: false,
      strictExam: false,
      tabVisible: true,
    })

    render(
      <MotionPageView
        viewKey="dashboard"
        policy={policy}
        signature={getThemeMotion('nexus')}
      >
        <h1>Dashboard</h1>
      </MotionPageView>,
    )

    expect(screen.getByTestId('motion-page')).toHaveAttribute('data-motion', 'full')
    expect(screen.getByTestId('motion-page')).toHaveAttribute('data-view', 'dashboard')
  })
})
