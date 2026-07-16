import { describe, expect, it } from 'vitest'

import { createUiStore } from './uiStore'

describe('UI store', () => {
  it('updates dialog, selection, loading, and error state', () => {
    const store = createUiStore()

    store.getState().openDialog('score-entry')
    store.getState().selectPlayer('mill')
    store.getState().selectRound('round-1')
    store.getState().setLoading(true)
    store.getState().setError('Try again')

    expect(store.getState()).toMatchObject({
      currentDialog: 'score-entry',
      selectedPlayerId: 'mill',
      selectedRoundId: 'round-1',
      isLoading: true,
      error: 'Try again',
    })
    store.getState().closeDialog()
    expect(store.getState().currentDialog).toBeNull()
  })

  it('adds, dismisses, and clears notifications immutably', () => {
    const store = createUiStore()
    const before = store.getState().notifications

    store
      .getState()
      .addNotification({ id: 'one', message: 'Saved', level: 'success' })
    store
      .getState()
      .addNotification({ id: 'two', message: 'Warning', level: 'warning' })

    expect(before).toEqual([])
    expect(store.getState().notifications).toHaveLength(2)
    store.getState().dismissNotification('one')
    expect(store.getState().notifications.map(({ id }) => id)).toEqual(['two'])
    store.getState().clearNotifications()
    expect(store.getState().notifications).toEqual([])
  })

  it('resets all UI-only state', () => {
    const store = createUiStore()
    store.getState().openDialog('settings')
    store.getState().selectPlayer('mill')
    store.getState().setLoading(true)

    store.getState().reset()

    expect(store.getState()).toMatchObject({
      currentDialog: null,
      selectedPlayerId: null,
      selectedRoundId: null,
      notifications: [],
      isLoading: false,
      error: null,
    })
  })
})
