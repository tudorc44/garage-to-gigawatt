// @vitest-environment happy-dom
// M15.2: the component-test setup works (happy-dom per file; every other test keeps the node environment).
import { fireEvent, render, screen } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { describe, expect, it } from 'vitest'

function Counter() {
  const [n, setN] = useState(0)
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      clicked {n}
    </button>
  )
}

describe('component tests', () => {
  it('render a Preact component and click it', () => {
    render(<Counter />)
    const b = screen.getByRole('button')
    expect(b.textContent).toBe('clicked 0')
    fireEvent.click(b)
    expect(b.textContent).toBe('clicked 1')
  })

  it('this file runs in happy-dom', () => {
    expect(typeof document).toBe('object')
  })
})
