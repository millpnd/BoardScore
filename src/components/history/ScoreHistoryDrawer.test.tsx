// @vitest-environment jsdom

import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { GameSession, ScoreEvent } from '@/models'
import {
  GameSessionStatus,
  RoundType,
  ScoreEventType,
  ScoringType,
  WinnerRule,
} from '@/models'
import { renderWithTheme } from '@/test/render'
import { ScoreHistoryDrawer } from './ScoreHistoryDrawer'

const session: GameSession = {
  id: 'session-1',
  template: {
    id: 'template-1',
    name: 'Test game',
    description: 'Test game',
    icon: 'cards',
    minimumPlayers: 2,
    maximumPlayers: null,
    scoringType: ScoringType.RunningTotal,
    winnerRule: WinnerRule.HighestScore,
    roundConfiguration: { type: RoundType.Unlimited },
    isBuiltIn: false,
    version: 1,
  },
  players: [
    { id: 'mill', name: 'Mill' },
    { id: 'john', name: 'John With A Very Long Name' },
  ],
  rounds: [
    {
      id: 'round-1',
      number: 1,
      startedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  scoreEvents: [],
  status: GameSessionStatus.Active,
}

const event = (
  id: string,
  playerId: string,
  points: number,
  createdAt: string,
  options: Partial<ScoreEvent> = {},
): ScoreEvent => ({
  createdAt,
  id,
  playerId,
  points,
  type: ScoreEventType.Score,
  ...options,
})

describe('ScoreHistoryDrawer', () => {
  it('provides an accessible empty state and close control', () => {
    renderWithTheme(
      <ScoreHistoryDrawer
        onClose={vi.fn()}
        opened
        session={session}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Score history' })).toBeVisible()
    expect(screen.getByText('No scores recorded yet.')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Close score history' }),
    ).toBeVisible()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders entries newest first with safe labels and round details', () => {
    const events = [
      event('old', 'mill', 12, '2026-01-01T00:01:00.000Z', {
        roundId: 'round-1',
      }),
      event('middle', 'john', -4000, '2026-01-01T00:02:00.000Z'),
      event('new', 'missing', 0, '2026-01-01T00:03:00.000Z', {
        roundId: 'missing-round',
        type: ScoreEventType.Correction,
      }),
    ]
    const currentSession = { ...session, scoreEvents: events }

    renderWithTheme(
      <ScoreHistoryDrawer
        onClose={vi.fn()}
        opened
        session={currentSession}
      />,
    )

    expect(screen.getByRole('list', { name: 'Score history groups' })).toBeVisible()
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings[0]).toHaveTextContent('Other scores')
    expect(headings[1]).toHaveTextContent('Round 1')

    const otherEntries = screen.getByRole('list', {
      name: 'Other scores score entries',
    })
    const roundEntries = screen.getByRole('list', {
      name: 'Round 1 score entries',
    })
    expect(within(otherEntries).getAllByRole('listitem')).toHaveLength(2)
    expect(otherEntries).toHaveTextContent('Unknown player')
    expect(otherEntries).toHaveTextContent('+0')
    expect(otherEntries).toHaveTextContent('Correction')
    expect(otherEntries).toHaveTextContent('John With A Very Long Name')
    expect(otherEntries).toHaveTextContent('−4,000')
    expect(otherEntries).not.toHaveTextContent('Round 1')
    expect(within(roundEntries).getAllByRole('listitem')).toHaveLength(1)
    expect(roundEntries).toHaveTextContent('Mill')
    expect(roundEntries).toHaveTextContent('+12')
    expect(within(roundEntries).getAllByRole('listitem')[0]).not.toHaveTextContent(
      'Round 1',
    )
    expect(
      screen
        .getAllByRole('listitem')
        .some((entry) => entry.querySelector('time')),
    ).toBe(false)
  })
})
