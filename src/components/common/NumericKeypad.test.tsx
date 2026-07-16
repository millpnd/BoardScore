// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import { NumericKeypad } from './NumericKeypad'

function KeypadHarness({ onSubmit }: { readonly onSubmit?: () => void }) {
  const [value, setValue] = useState('')
  return (
    <NumericKeypad
      label="Points"
      onChange={setValue}
      onSubmit={onSubmit}
      value={value}
    />
  )
}

describe('NumericKeypad', () => {
  it('enters, edits, signs, and clears a value', async () => {
    const user = userEvent.setup()
    renderWithTheme(<KeypadHarness />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    expect(screen.getByRole('status')).toHaveTextContent('10')

    await user.click(screen.getByRole('button', { name: 'Toggle negative' }))
    expect(screen.getByRole('status')).toHaveTextContent('-10')
    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(screen.getByRole('status')).toHaveTextContent('-1')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('supports physical keyboard entry and submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(<KeypadHarness onSubmit={onSubmit} />)
    const keypad = screen.getByRole('group', { name: 'Points numeric keypad' })
    keypad.focus()

    await user.keyboard('42{Backspace}7{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('47')
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('replaces leading zero and respects disabled and negative settings', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const firstRender = renderWithTheme(
      <NumericKeypad allowNegative={false} onChange={onChange} value="0" />,
    )

    await user.click(screen.getByRole('button', { name: '5' }))
    expect(onChange).toHaveBeenCalledWith('5')
    expect(
      screen.getByRole('button', { name: 'Toggle negative' }),
    ).toBeDisabled()

    firstRender.unmount()
    renderWithTheme(<NumericKeypad disabled onChange={onChange} value="12" />)
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
  })
})
