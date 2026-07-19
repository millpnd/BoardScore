// @vitest-environment jsdom

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '@/app/App'
import { StoreProvider } from '@/app/StoreProvider'
import type { SetupFlowStores } from '@/app/storeContext'
import type { GameTemplate } from '@/models'
import { RoundType, ScoringType, WinnerRule } from '@/models'
import {
  createSetupFlowStores,
  SetupFlowMemoryStorage,
} from '@/test/createTestStores'
import { renderWithTheme } from '@/test/render'

const customTemplate = (
  overrides: Partial<GameTemplate> = {},
): GameTemplate => ({
  id: 'custom-template',
  name: 'Custom Template',
  description: 'A stored custom game.',
  icon: 'dice',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
  ...overrides,
})

const renderRoute = (
  initialEntry: string,
  storage = new SetupFlowMemoryStorage(),
  stores: SetupFlowStores = createSetupFlowStores(storage),
) => {
  const result = renderWithTheme(
    <StoreProvider stores={stores}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </StoreProvider>,
  )
  return { ...result, storage, stores }
}

const fillTemplateBasics = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  description = 'Score this custom game.',
) => {
  await user.type(await screen.findByLabelText('Game Name'), name)
  await user.type(screen.getByLabelText('Description'), description)
}

const saveTemplate = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Save Template' }))
}

const startGameFromSelection = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  playerNames: readonly string[] = ['Mill', 'John'],
) => {
  await user.click(
    await screen.findByRole('button', { name: new RegExp(name) }),
  )
  const inputs = await screen.findAllByPlaceholderText('Enter name')
  for (const [index, playerName] of playerNames.entries()) {
    await user.type(inputs[index]!, playerName)
  }
  await user.click(screen.getByRole('button', { name: 'Start game' }))
  expect(await screen.findByRole('heading', { name })).toBeVisible()
}

const enterScore = async (
  user: ReturnType<typeof userEvent.setup>,
  playerName: string,
  digits: string,
) => {
  await user.click(screen.getByRole('button', { name: new RegExp(playerName) }))
  for (const digit of digits) {
    await user.click(screen.getByRole('button', { name: digit }))
  }
  await user.click(screen.getByRole('button', { name: 'Done' }))
}

const finishGame = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Finish game' }))
  await user.click(
    within(
      await screen.findByRole('dialog', { name: 'Finish game?' }),
    ).getByRole('button', { name: 'Finish game' }),
  )
}

describe('template management routes', () => {
  it('shows an empty custom template list and opens the create flow', async () => {
    const user = userEvent.setup()
    renderRoute('/templates')

    expect(await screen.findByText('No Custom Games Yet')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Create Custom Game' }))

    expect(
      await screen.findByRole('heading', { name: 'Create Custom Game' }),
    ).toBeVisible()
  })

  it('creates a custom running-total template, persists it, reloads it, and plays through winner', async () => {
    const storage = new SetupFlowMemoryStorage()
    const user = userEvent.setup()
    const firstRender = renderRoute('/templates/new', storage)

    await fillTemplateBasics(user, 'Table Points')
    await saveTemplate(user)

    await waitFor(() => expect(storage.templates).toHaveLength(1), {
      timeout: 5000,
    })
    expect(
      await screen.findByText('Custom game created.', undefined, {
        timeout: 5000,
      }),
    ).toBeVisible()
    expect(storage.templates[0]).toMatchObject({
      name: 'Table Points',
      isBuiltIn: false,
      scoringType: ScoringType.RunningTotal,
    })
    expect(storage.templates[0]?.id).not.toBe('table-points')
    firstRender.unmount()

    renderRoute('/games', storage)
    const gameButton = await screen.findByRole('button', {
      name: /Table Points/,
    })
    expect(gameButton).toHaveTextContent('Custom')
    await startGameFromSelection(user, 'Table Points')
    await enterScore(user, 'Mill', '9')
    await finishGame(user)

    expect(
      await screen.findByRole('heading', { name: 'Game complete' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Mill' })).toBeVisible()
    expect(screen.getByText('9 Points')).toBeVisible()
    expect(storage.session).toBeNull()
  }, 20000)

  it('creates a fixed per-round custom template and scores it through the shared flow', async () => {
    const storage = new SetupFlowMemoryStorage()
    const user = userEvent.setup()
    const firstRender = renderRoute('/templates/new', storage)

    await fillTemplateBasics(user, 'Round Ledger')
    await user.click(screen.getByRole('radio', { name: 'Per Round' }))
    await user.click(
      screen.getByRole('radio', { name: 'Fixed Number of Rounds' }),
    )
    await user.type(await screen.findByLabelText('Number of Rounds'), '2')
    await saveTemplate(user)
    await waitFor(() => expect(storage.templates).toHaveLength(1), {
      timeout: 5000,
    })
    expect(
      await screen.findByText('Custom game created.', undefined, {
        timeout: 5000,
      }),
    ).toBeVisible()
    firstRender.unmount()

    renderRoute('/games', storage)
    await startGameFromSelection(user, 'Round Ledger')
    expect(screen.getByLabelText('Round 1 of 2')).toBeVisible()
    await enterScore(user, 'Mill', '4')
    await user.click(screen.getByRole('button', { name: 'Next round' }))
    expect(await screen.findByLabelText('Round 2 of 2')).toBeVisible()
    await enterScore(user, 'John', '6')
    await finishGame(user)

    expect(await screen.findByRole('heading', { name: 'John' })).toBeVisible()
    expect(screen.getByText('6 Points')).toBeVisible()
  }, 20000)

  it('shows form validation for required names, player limits, and fixed rounds', async () => {
    const user = userEvent.setup()
    renderRoute('/templates/new')

    await screen.findByRole('heading', { name: 'Create Custom Game' })
    await user.clear(screen.getByLabelText('Minimum Players'))
    await user.type(screen.getByLabelText('Minimum Players'), '4')
    await user.type(screen.getByLabelText('Maximum Players'), '3')
    await user.click(
      screen.getByRole('radio', { name: 'Fixed Number of Rounds' }),
    )
    await saveTemplate(user)

    expect(await screen.findByText('Game name is required.')).toBeVisible()
    expect(screen.getByText('Description is required.')).toBeVisible()
    expect(
      screen.getByText(
        'Maximum players must be greater than or equal to minimum players.',
      ),
    ).toBeVisible()
    expect(
      screen.getByText('Number of rounds must be greater than zero.'),
    ).toBeVisible()
  })

  it('loads and edits an existing custom template while preserving the ID', async () => {
    const storage = new SetupFlowMemoryStorage()
    storage.templates = [
      customTemplate({
        id: 'saved-custom',
        name: 'Old Name',
        maximumPlayers: 4,
      }),
    ]
    const user = userEvent.setup()
    renderRoute('/templates/saved-custom/edit', storage)

    const name = await screen.findByLabelText('Game Name')
    expect(name).toHaveValue('Old Name')
    expect(screen.getByLabelText('Maximum Players')).toHaveValue('4')
    await user.clear(name)
    await user.type(name, 'New Name')
    await saveTemplate(user)

    await waitFor(() => expect(storage.templates[0]?.name).toBe('New Name'), {
      timeout: 5000,
    })
    expect(
      await screen.findByText('Custom game updated.', undefined, {
        timeout: 5000,
      }),
    ).toBeVisible()
    expect(storage.templates[0]).toMatchObject({
      id: 'saved-custom',
      name: 'New Name',
      maximumPlayers: 4,
    })
  })

  it('prevents editing built-in templates and handles missing template IDs', async () => {
    const { unmount } = renderRoute('/templates/scrabble/edit')

    expect(await screen.findByText('Built-in game locked')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Save Template' }),
    ).not.toBeInTheDocument()
    unmount()

    renderRoute('/templates/missing/edit')
    expect(await screen.findByText('Template not found')).toBeVisible()
  })

  it('deletes custom templates after confirmation and removes them from game selection', async () => {
    const storage = new SetupFlowMemoryStorage()
    storage.templates = [customTemplate({ name: 'Delete Me' })]
    const user = userEvent.setup()
    const firstRender = renderRoute('/templates', storage)

    const actions = await screen.findByRole('navigation', {
      name: 'Delete Me actions',
    })
    await user.click(within(actions).getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete Custom Game?',
    })
    expect(dialog).toHaveTextContent('permanently remove')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(storage.templates).toEqual([]))
    expect(await screen.findByText('Custom game deleted.')).toBeVisible()
    firstRender.unmount()

    renderRoute('/games', storage)
    await screen.findByRole('button', { name: /Scrabble/ })
    expect(
      screen.queryByRole('button', { name: /Delete Me/ }),
    ).not.toBeInTheDocument()
  })

  it('disables and rejects deleting a custom template used by an active session', async () => {
    const storage = new SetupFlowMemoryStorage()
    storage.templates = [customTemplate({ name: 'Active Custom' })]
    const setupStores = createSetupFlowStores(storage)
    await setupStores.templates.getState().loadTemplates()
    await setupStores.game.getState().setupGame({
      sessionId: 'session-1',
      templateId: 'custom-template',
      players: [
        { id: 'mill', name: 'Mill' },
        { id: 'john', name: 'John' },
      ],
      startedAt: '2026-01-01T00:00:00.000Z',
      initialRoundId: 'round-1',
    })
    const stores = createSetupFlowStores(storage)

    renderRoute('/templates', storage, stores)

    const actions = await screen.findByRole('navigation', {
      name: 'Active Custom actions',
    })
    await waitFor(() =>
      expect(
        within(actions).getByRole('button', { name: 'Delete' }),
      ).toBeDisabled(),
    )
    expect(
      screen.getByText('Finish or discard the active game before deleting.'),
    ).toBeVisible()

    expect(
      await stores.templates.getState().deleteTemplate('custom-template'),
    ).toBe(false)
    expect(stores.templates.getState().error).toContain('active game')
    expect(storage.templates).toHaveLength(1)
  })
})
