import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeAtmosphereView } from './theme-atmosphere'
import { resolveMotionPolicy } from '@/lib/motion/policy'
import { getThemeMotion } from '@/lib/motion/theme-motion'

describe('ThemeAtmosphereView', () => {
  it('renders only the selected palette atmosphere', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'full',
      osReducedMotion: false,
      lowPower: false,
      strictExam: false,
      tabVisible: true,
    })

    render(
      <ThemeAtmosphereView
        palette="ocean"
        policy={policy}
        signature={getThemeMotion('ocean')}
      />,
    )

    expect(screen.getByTestId('theme-atmosphere')).toHaveAttribute('data-palette', 'ocean')
    expect(screen.getByTestId('theme-atmosphere')).toHaveAttribute('data-motion-mode', 'animated')
    expect(screen.getAllByTestId('atmosphere-node')).toHaveLength(4)
  })

  it('does not render when ambient motion is disabled', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'none',
      osReducedMotion: false,
      lowPower: false,
      strictExam: false,
      tabVisible: true,
    })

    const { container } = render(
      <ThemeAtmosphereView
        palette="sakura"
        policy={policy}
        signature={getThemeMotion('sakura')}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
