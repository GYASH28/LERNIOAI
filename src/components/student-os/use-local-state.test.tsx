import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { updateLocalStudentState, useLocalState } from './use-local-state'

const stateKey = 'lernio:test:local-state'

function Harness() {
  const [state, setState, hydrated] = useLocalState(stateKey, { count: 0 })
  return (
    <div>
      <span data-testid="hydrated">{String(hydrated)}</span>
      <span data-testid="count">{state.count}</span>
      <button type="button" onClick={() => setState((current) => ({ count: current.count + 1 }))}>Increment</button>
    </div>
  )
}

describe('useLocalState', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false }, { status: 401 })))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('hydrates a local value and preserves functional updates for later sync', async () => {
    window.localStorage.setItem(stateKey, JSON.stringify({ count: 4 }))
    const user = userEvent.setup()
    render(<Harness />)

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'))
    expect(screen.getByTestId('count')).toHaveTextContent('4')

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    expect(screen.getByTestId('count')).toHaveTextContent('5')
    expect(JSON.parse(window.localStorage.getItem(stateKey) || '{}')).toEqual({ count: 5 })
    expect(JSON.parse(window.localStorage.getItem(`${stateKey}.sync.v1`) || '{}')).toMatchObject({ dirty: true })
  })

  it('accepts an update made by another Lernio learning surface', async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'))

    updateLocalStudentState(stateKey, { count: 0 }, () => ({ count: 9 }))

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('9'))
  })
})
