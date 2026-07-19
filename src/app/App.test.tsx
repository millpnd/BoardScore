// @vitest-environment jsdom

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { SessionEngine } from '@/engine'
import { StoreProvider } from '@/app/StoreProvider'
import {
  createSetupFlowStores,
  SetupFlowMemoryStorage,
} from '@/test/createTestStores'
import { renderWithTheme } from '@/test/render'

import { AppRoutes } from './App'

const renderRoute = (
  initialEntry: string,
  storage = new SetupFlowMemoryStorage(),
) => {
  const stores = createSetupFlowStores(storage)
  const result = renderWithTheme(
    <StoreProvider stores={stores}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  )
  return { ...result, storage, stores }
}

const persistedSession = () => {
  const engine = new SessionEngine()
  engine.createSession({ id: 'session-1', templateId: 'scrabble' })
  engine.addPlayer({ id: 'mill', name: 'Mill' })
  engine.addPlayer({ id: 'john', name: 'John' })
  engine.startGame('2026-01-01T00:00:00.000Z')
  engine.nextRound({ id: 'round-1', startedAt: '2026-01-01T00:05:00.000Z' })
  return engine.getCurrentSession()!
}

describe('game setup routes', () => {
  it('renders Home and navigates to game selection', async () => {
    const user = userEvent.setup()
    renderRoute('/')

    expect(screen.getByLabelText('BoardScore')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'New game' }))

    expect(
      await screen.findByRole('heading', { name: 'Select a game' }),
    ).toBeVisible()
    expect(
      await screen.findByRole('list', { name: 'Available games' }),
    ).toBeVisible()
  })

  it('asks before restoring and resumes a persisted game', async () => {
    const storage = new SetupFlowMemoryStorage()
    storage.session = persistedSession()
    const user = userEvent.setup()
    renderRoute('/', storage)

    expect(
      await screen.findByRole('dialog', { name: 'Resume previous game' }),
    ).toBeVisible()
    expect(screen.getByText('Players: Mill, John')).toBeVisible()
    expect(screen.getByText('Round 1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Resume game' }))

    expect(
      await screen.findByRole('heading', { name: 'Scrabble' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: /Mill/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /John/ })).toBeVisible()
  })

  it('discards a persisted game only after confirmation', async () => {
    const storage = new SetupFlowMemoryStorage()
    storage.session = persistedSession()
    const user = userEvent.setup()
    renderRoute('/', storage)

    await user.click(
      await screen.findByRole('button', { name: 'Discard game' }),
    )

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Resume previous game' }),
      ).not.toBeInTheDocument(),
    )
    expect(storage.session).toBeNull()
  })

  it('searches templates and navigates from a selected game to players', async () => {
    const user = userEvent.setup()
    renderRoute('/games')

    const search = await screen.findByRole('searchbox', {
      name: 'Search games',
    })
    await user.type(search, 'qwirkle')
    expect(screen.getByRole('button', { name: /Qwirkle/ })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /Scrabble/ }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Qwirkle/ }))

    expect(
      await screen.findByRole('heading', { name: 'Add players' }),
    ).toBeVisible()
    expect(screen.getByText('Qwirkle')).toBeVisible()
  })

  it('completes Home to scoring setup through real stores', async () => {
    const user = userEvent.setup()
    const { storage } = renderRoute('/games')

    await user.click(await screen.findByRole('button', { name: /Scrabble/ }))
    const names = screen.getAllByPlaceholderText('Enter name')
    await user.type(names[0]!, 'Mill')
    await user.type(names[1]!, 'John')
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(
      await screen.findByRole('heading', { name: 'Scrabble' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Standings' })).toBeVisible()
    expect(storage.session?.players.map(({ name }) => name)).toEqual([
      'Mill',
      'John',
    ])
    expect(storage.session?.rounds).toHaveLength(1)
  })

  it('adds and removes player fields without imposing a UI maximum', async () => {
    const user = userEvent.setup()
    renderRoute('/games')
    await user.click(await screen.findByRole('button', { name: /Scrabble/ }))

    await user.click(screen.getByRole('button', { name: 'Add player' }))
    expect(screen.getAllByPlaceholderText('Enter name')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Remove player 3' }))
    expect(screen.getAllByPlaceholderText('Enter name')).toHaveLength(2)
  })

  it('shows friendly empty, duplicate, and minimum-player validation', async () => {
    const user = userEvent.setup()
    renderRoute('/games')
    await user.click(await screen.findByRole('button', { name: /Scrabble/ }))

    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(await screen.findAllByText('Player name is required.')).toHaveLength(
      2,
    )

    const names = screen.getAllByPlaceholderText('Enter name')
    await user.type(names[0]!, 'Mill')
    await user.type(names[1]!, 'mill')
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(await screen.findByText(/already in use/)).toBeVisible()

    await user.clear(names[1]!)
    await user.type(names[1]!, 'John')
    await user.click(screen.getByRole('button', { name: 'Remove player 2' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(await screen.findByText(/At least 2 players/)).toBeVisible()
  })

  it('handles missing templates and unknown routes', () => {
    const { unmount } = renderRoute('/players')
    expect(screen.getByText('No game selected')).toBeVisible()
    unmount()

    renderRoute('/missing')
    expect(screen.getByText('Page not found')).toBeVisible()
  })
})
