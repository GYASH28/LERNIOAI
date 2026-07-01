import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './card'

describe('Card surface variants', () => {
  it('maps semantic surface prop to a visible data attribute and class', () => {
    render(<Card surface="elevated">Surface</Card>)

    const card = screen.getByText('Surface')
    expect(card).toHaveAttribute('data-surface-role', 'elevated')
    expect(card).toHaveClass('surface-elevated')
  })

  it('defaults to panel surface', () => {
    render(<Card>Panel</Card>)

    const card = screen.getByText('Panel')
    expect(card).toHaveAttribute('data-surface-role', 'panel')
    expect(card).toHaveClass('surface-panel')
  })
})
