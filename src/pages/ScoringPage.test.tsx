// @vitest-environment jsdom

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '@/app/App'
import { StoreProvider } from '@/app/StoreProvider'
import type { SetupFlowStores } from '@/app/storeContext'
import type { GameTemplate, Player } from '@/models'
import { RoundType, ScoringType, WinnerRule } from '@/models'
import {
  createSetupFlowStores,
  SetupFlowMemoryStorage,
} from '@/test/createTestStores'
import { renderWithTheme } from '@/test/render'

const runningTemplateId = 'scrabble'
const players: readonly Player[] = [
  { id: 'mill', name: 'Mill' },
  { id: 'john', name: 'John' },
]

const renderScoring = async (
  templateId = runningTemplateId,
  gamePlayers: readonly Player[] = players,
  storage = new SetupFlowMemoryStorage(),
) => {
  const stores = createSetupFlowStores(storage)
  await stores.templates.getState().loadTemplates()
  await stores.game.getState().setupGame({
    sessionId: 'session-1',
    templateId,
    players: gamePlayers,
    startedAt: '2026-01-01T00:00:00.000Z',
    initialRoundId: 'round-1',
  })
  renderWithTheme(
    <StoreProvider stores={stores}>
      <MemoryRouter initialEntries={['/scoring']}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  )
  return { stores, storage }
}

const selectPlayer = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  const card = screen.getByRole('button', { name: new RegExp(name) })
  await user.click(card)
  return card
}

const enterScore = async (
  user: ReturnType<typeof userEvent.setup>,
  digits: string,
) => {
  for (const digit of digits) {
    await user.click(screen.getByRole('button', { name: digit }))
  }
  await user.click(screen.getByRole('button', { name: 'Done' }))
}

describe('ScoringPage', () => {
  it('renders active session information and selects one player', async () => {
    const user = userEvent.setup()
    await renderScoring()

    expect(screen.getByRole('heading', { name: 'Scrabble' })).toBeVisible()
    expect(screen.getByText('Round 1 · 2 players')).toBeVisible()
    expect(screen.getByLabelText('Round 1')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()

    const mill = await selectPlayer(user, 'Mill')
    expect(mill).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('group', { name: 'Score for Mill numeric keypad' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: /John/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('records running-total scores, persists, updates standings, and undoes', async () => {
    const user = userEvent.setup()
    const { storage } = await renderScoring()
    const mill = await selectPlayer(user, 'Mill')

    await enterScore(user, '12')

    expect(mill).toHaveTextContent('12')
    expect(storage.session?.scoreEvents[0]).toMatchObject({
      playerId: 'mill',
      points: 12,
      roundId: undefined,
    })
    expect(screen.getByLabelText('Rank 1')).toBeVisible()
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).toBeEnabled()

    await user.click(undo)

    expect(mill).toHaveTextContent('0')
    expect(storage.session?.scoreEvents).toEqual([])
    expect(undo).toBeDisabled()
  })

  it('advances rounds through SessionEngine and persists the session', async () => {
    const user = userEvent.setup()
    const { storage } = await renderScoring()

    await user.click(screen.getByRole('button', { name: 'Next round' }))

    expect(await screen.findByText('Round 2 · 2 players')).toBeVisible()
    expect(storage.session?.rounds).toHaveLength(2)
    expect(storage.session?.rounds[1]?.number).toBe(2)
  })

  it('shows per-round and overall totals using engine projections', async () => {
    const perRoundTemplate: GameTemplate = {
      id: 'round-game',
      name: 'Round Game',
      description: 'Per-round test game.',
      icon: 'cards',
      minimumPlayers: 2,
      maximumPlayers: null,
      scoringType: ScoringType.PerRound,
      winnerRule: WinnerRule.HighestScore,
      roundConfiguration: { type: RoundType.Unlimited },
      isBuiltIn: false,
      version: 1,
    }
    const storage = new SetupFlowMemoryStorage()
    storage.templates = [perRoundTemplate]
    const user = userEvent.setup()
    const { stores } = await renderScoring('round-game', players, storage)
    const mill = await selectPlayer(user, 'Mill')

    await enterScore(user, '8')
    expect(mill).toHaveTextContent('Round score: 8')
    expect(mill).toHaveTextContent('8')

    await user.click(screen.getByRole('button', { name: 'Next round' }))
    expect(mill).toHaveTextContent('Round score: 0')
    expect(mill).toHaveTextContent('8')

    await selectPlayer(user, 'John')
    await enterScore(user, '8')
    expect(screen.getAllByLabelText('Rank 1')).toHaveLength(2)
    expect(stores.game.getState().currentRoundScores).toMatchObject([
      { playerId: 'mill', total: 0 },
      { playerId: 'john', total: 8 },
    ])
  })

  it('confirms leaving without discarding saved progress', async () => {
    const user = userEvent.setup()
    const { storage } = await renderScoring()

    await user.click(screen.getByRole('button', { name: 'Leave game' }))
    const dialog = await screen.findByRole('dialog', { name: 'Leave game?' })
    expect(dialog).toHaveTextContent('Progress has already been saved')
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }))
    expect(screen.getByRole('heading', { name: 'Scrabble' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Leave game' }))
    await user.click(
      within(
        await screen.findByRole('dialog', { name: 'Leave game?' }),
      ).getByRole('button', { name: 'Leave' }),
    )
    expect(await screen.findByLabelText('BoardScore')).toBeVisible()
    expect(storage.session).not.toBeNull()
  })

  it('confirms ending the game, clears persistence, and opens final results', async () => {
    const user = userEvent.setup()
    const { storage } = await renderScoring()
    await selectPlayer(user, 'Mill')
    await enterScore(user, '7')

    const gameControls = screen.getByRole('navigation', {
      name: 'Game controls',
    })
    await user.click(
      within(gameControls).getByRole('button', { name: 'Finish game' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Finish game?' })
    expect(dialog).toHaveTextContent(
      'Are you sure you want to finish this game?',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Scrabble' })).toBeVisible()

    await user.click(
      within(gameControls).getByRole('button', { name: 'Finish game' }),
    )
    await user.click(
      within(
        await screen.findByRole('dialog', { name: 'Finish game?' }),
      ).getByRole('button', { name: 'Finish game' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Game complete' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Mill' })).toBeVisible()
    expect(storage.session).toBeNull()
  })

  it('shows persistence errors without crashing score entry', async () => {
    const user = userEvent.setup()
    const storage = new SetupFlowMemoryStorage()
    await renderScoring(runningTemplateId, players, storage)
    storage.saveSession = async () => {
      throw new Error('Storage unavailable')
    }
    await selectPlayer(user, 'Mill')

    await enterScore(user, '5')

    expect(await screen.findByText('Storage unavailable')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Scrabble' })).toBeVisible()
  })

  it('redirects invalid scoring sessions to Home', async () => {
    const stores: SetupFlowStores = createSetupFlowStores()
    renderWithTheme(
      <StoreProvider stores={stores}>
        <MemoryRouter initialEntries={['/scoring']}>
          <AppRoutes />
        </MemoryRouter>
      </StoreProvider>,
    )

    expect(await screen.findByLabelText('BoardScore')).toBeVisible()
  })
})
