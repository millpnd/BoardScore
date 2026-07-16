// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import { ConfirmDialog, ResumeSessionDialog } from './Dialogs'

describe('dialogs', () => {
  it('confirms and cancels with explicit actions', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <ConfirmDialog
        message="Remove this entry?"
        onCancel={onCancel}
        onConfirm={onConfirm}
        opened
        title="Confirm removal"
      />,
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Confirm removal')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('offers resume and discard without business behavior', async () => {
    const onResume = vi.fn()
    const onDiscard = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <ResumeSessionDialog
        detail="Round 2"
        gameName="Qwirkle"
        onDiscard={onDiscard}
        onResume={onResume}
        opened
      />,
    )

    expect(screen.getByText('Qwirkle')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Resume game' }))
    await user.click(screen.getByRole('button', { name: 'Discard game' }))
    expect(onResume).toHaveBeenCalledOnce()
    expect(onDiscard).toHaveBeenCalledOnce()
  })
})
