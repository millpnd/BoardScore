// @vitest-environment jsdom

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '@/app/App'
import { StoreProvider } from '@/app/StoreProvider'
import type { SetupFlowStores } from '@/app/storeContext'
import type { Player } from '@/models'
import { GameSessionStatus } from '@/models'
import {
  createSetupFlowStores,
  SetupFlowMemoryStorage,
} from '@/test/createTestStores'
import { renderWithTheme } from '@/test/render'

const players: readonly Player[] = [
  { id: 'mill', name: 'Mill' },
  { id: 'john', name: 'John' },
  { id: 'jane', name: 'Jane' },
]

const completeGame = async (
  scores: Readonly<Record<string, number>>,
  gamePlayers: readonly Player[] = players,
) => {
  const storage = new SetupFlowMemoryStorage()
  const stores = createSetupFlowStores(storage)
  await stores.templates.getState().loadTemplates()
  await stores.game.getState().setupGame({
    sessionId: 'session-1',
    templateId: 'scrabble',
    players: gamePlayers,
    startedAt: '2026-01-01T00:00:00.000Z',
    initialRoundId: 'round-1',
  })
  for (const [index, player] of gamePlayers.entries()) {
    const points = scores[player.id]
    if (points === undefined) continue
    await stores.game.getState().recordScore({
      eventId: `score-${index}`,
      actionId: `action-${index}`,
      playerId: player.id,
      points,
      timestamp: `2026-01-01T00:0${index + 1}:00.000Z`,
    })
  }
  await stores.game.getState().endGame('2026-01-01T01:00:00.000Z')
  return { stores, storage }
}

const renderWinner = async (
  scores: Readonly<Record<string, number>>,
  gamePlayers: readonly Player[] = players,
) => {
  const result = await completeGame(scores, gamePlayers)
  renderWithTheme(
    <StoreProvider stores={result.stores}>
      <MemoryRouter initialEntries={['/winner']}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  )
  return result
}

const renderRoute = (
  path: string,
  stores: SetupFlowStores = createSetupFlowStores(),
) =>
  renderWithTheme(
    <StoreProvider stores={stores}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  )

describe('WinnerPage', () => {
  it('shows the single winner, winning score, and engine-ranked standings', async () => {
    await renderWinner({ mill: 72, jane: 68, john: 54 })

    expect(screen.getByRole('heading', { name: 'Game complete' })).toBeVisible()
    const winnerHeading = screen.getByRole('heading', { name: 'Mill' })
    expect(winnerHeading).toBeVisible()
    expect(winnerHeading).toHaveFocus()
    expect(screen.getByText('72 Points')).toBeVisible()

    const standings = screen.getByRole('list', { name: 'Final standings' })
    expect(
      within(standings).getByLabelText('Rank 1, Mill, 72 points, winner'),
    ).toBeVisible()
    expect(
      within(standings).getByLabelText('Rank 2, Jane, 68 points'),
    ).toBeVisible()
    expect(
      within(standings).getByLabelText('Rank 3, John, 54 points'),
    ).toBeVisible()
  })

  it('shows every genuine winner and preserves tied ranking', async () => {
    const { stores } = await renderWinner({ mill: 72, jane: 72, john: 54 })

    expect(screen.getAllByText('Winners')).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Mill' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Jane' })).toBeVisible()
    expect(screen.getAllByText('72 Points')).toHaveLength(1)
    expect(stores.game.getState().winnerResult).toMatchObject({
      isTie: true,
      standings: [
        { playerId: 'mill', rank: 1 },
        { playerId: 'jane', rank: 1 },
        { playerId: 'john', rank: 3 },
      ],
    })
    expect(
      screen.getByLabelText('Rank 1, Jane, 72 points, winner'),
    ).toBeVisible()
    expect(screen.getByLabelText('Rank 3, John, 54 points')).toBeVisible()
  })

  it('plays again with retained players and clean score, round, and undo state', async () => {
    const user = userEvent.setup()
    const { stores, storage } = await renderWinner({
      mill: 12,
      jane: 8,
      john: 4,
    })

    await user.click(screen.getByRole('button', { name: 'Play again' }))

    expect(
      await screen.findByRole('heading', { name: 'Scrabble' }),
    ).toBeVisible()
    expect(stores.game.getState()).toMatchObject({
      canUndo: false,
      isGameActive: true,
      players: [{ name: 'Mill' }, { name: 'John' }, { name: 'Jane' }],
      session: {
        status: GameSessionStatus.Active,
        scoreEvents: [],
        rounds: [{ number: 1 }],
      },
    })
    expect(storage.session?.status).toBe(GameSessionStatus.Active)
  })

  it('edits the retained roster before starting a score-free replay', async () => {
    const user = userEvent.setup()
    const { stores } = await renderWinner({
      mill: 12,
      jane: 8,
      john: 4,
    })

    await user.click(screen.getByRole('button', { name: 'Edit players' }))
    expect(
      await screen.findByRole('heading', { name: 'Edit players' }),
    ).toBeVisible()
    const names = screen.getAllByPlaceholderText('Enter name')
    expect(names[0]).toHaveValue('Mill')
    expect(names[1]).toHaveValue('John')
    expect(names[2]).toHaveValue('Jane')

    await user.clear(names[0]!)
    await user.type(names[0]!, 'Mila')
    await user.click(screen.getByRole('button', { name: 'Remove player 2' }))
    await user.click(screen.getByRole('button', { name: 'Start new game' }))

    expect(
      await screen.findByRole('heading', { name: 'Scrabble' }),
    ).toBeVisible()
    expect(stores.game.getState().session).toMatchObject({
      status: GameSessionStatus.Active,
      players: [{ name: 'Mila' }, { name: 'Jane' }],
      scoreEvents: [],
    })
  })

  it.each([
    ['Choose another game', 'Select a game'],
    ['Return home', 'BoardScore'],
  ])('clears completed state for %s', async (action, destination) => {
    const user = userEvent.setup()
    const { stores, storage } = await renderWinner({ mill: 1 })

    await user.click(screen.getByRole('button', { name: action }))

    if (destination === 'BoardScore') {
      expect(await screen.findByLabelText(destination)).toBeVisible()
    } else {
      expect(
        await screen.findByRole('heading', { name: destination }),
      ).toBeVisible()
    }
    expect(stores.game.getState().session).toBeUndefined()
    expect(storage.session).toBeNull()
  })

  it('redirects invalid direct navigation to Home', async () => {
    renderRoute('/winner')

    expect(await screen.findByLabelText('BoardScore')).toBeVisible()
  })

  it('shows a friendly result state when a completed game has no winner', async () => {
    const user = userEvent.setup()
    const { stores } = await completeGame({}, players.slice(0, 2))
    renderRoute('/winner', stores)

    expect(screen.getByText('Results unavailable')).toBeVisible()
    expect(
      screen.getByText('Final winner data could not be determined.'),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Return home' }))
    await waitFor(() => expect(stores.game.getState().session).toBeUndefined())
  })

  it('uses a singular point label for a score of one', async () => {
    await renderWinner({ mill: 1 }, players.slice(0, 2))

    expect(screen.getByText('1 Point')).toBeVisible()
    expect(screen.getByLabelText('Rank 1, Mill, 1 point, winner')).toBeVisible()
  })
})
