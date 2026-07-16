import { describe, expect, it } from 'vitest'

import type { GameSession, GameTemplate, ScoreEvent } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import { ScoreEngineError, type PlayerStanding } from '../score'
import { WinnerEngine, type StandingsProvider } from './WinnerEngine'
import {
  WinnerEngineError,
  type WinnerEngineErrorCode,
} from './WinnerEngineError'

const template = (overrides: Partial<GameTemplate> = {}): GameTemplate => ({
  id: 'winner-test',
  name: 'Winner Test',
  description: 'Template for WinnerEngine tests.',
  icon: 'trophy',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
  ...overrides,
})

const event = (id: string, playerId: string, points: number): ScoreEvent => ({
  id,
  playerId,
  type: ScoreEventType.Score,
  points,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  template: template(),
  players: [
    { id: 'mill', name: 'Mill' },
    { id: 'john', name: 'John' },
    { id: 'jane', name: 'Jane' },
  ],
  rounds: [],
  scoreEvents: [],
  status: GameSessionStatus.Active,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const expectCode = (
  code: WinnerEngineErrorCode,
  action: () => unknown,
): WinnerEngineError => {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(WinnerEngineError)
    expect((error as WinnerEngineError).code).toBe(code)
    return error as WinnerEngineError
  }
  throw new Error(`Expected ${code}.`)
}

const provider = (standings: readonly PlayerStanding[]): StandingsProvider => ({
  getStandings: () => standings,
})

describe('WinnerEngine winner rules', () => {
  it('finds one highest-score winner in a two-player game', () => {
    const active = session({
      players: [
        { id: 'mill', name: 'Mill' },
        { id: 'john', name: 'John' },
      ],
      scoreEvents: [event('one', 'mill', 72), event('two', 'john', 68)],
    })

    const result = new WinnerEngine().evaluate(active)

    expect(result.winners.map(({ playerId }) => playerId)).toEqual(['mill'])
    expect(result.isTie).toBe(false)
    expect(result.standings).toEqual([
      {
        playerId: 'mill',
        playerName: 'Mill',
        total: 72,
        rank: 1,
        isWinner: true,
      },
      {
        playerId: 'john',
        playerName: 'John',
        total: 68,
        rank: 2,
        isWinner: false,
      },
    ])
  })

  it('finds the lowest-score winner, including negative scores', () => {
    const active = session({
      template: template({ winnerRule: WinnerRule.LowestScore }),
      scoreEvents: [
        event('one', 'mill', -5),
        event('two', 'john', 0),
        event('three', 'jane', -2),
      ],
    })

    const result = new WinnerEngine().evaluate(active)

    expect(result.standings.map(({ playerId }) => playerId)).toEqual([
      'mill',
      'jane',
      'john',
    ])
    expect(result.winners[0]?.playerId).toBe('mill')
  })

  it('preserves a two-way tie and uses competition ranking', () => {
    const active = session({
      scoreEvents: [
        event('one', 'mill', 72),
        event('two', 'john', 68),
        event('three', 'jane', 72),
      ],
    })

    const result = new WinnerEngine().evaluate(active)

    expect(result.winners.map(({ playerId }) => playerId)).toEqual([
      'mill',
      'jane',
    ])
    expect(result.standings.map(({ rank }) => rank)).toEqual([1, 1, 3])
    expect(result.isTie).toBe(true)
  })

  it('preserves player display order for genuine ties', () => {
    const active = session({
      scoreEvents: [
        event('one', 'mill', 10),
        event('two', 'john', 10),
        event('three', 'jane', 5),
      ],
    })

    expect(
      new WinnerEngine().getStandings(active).map(({ playerId }) => playerId),
    ).toEqual(['mill', 'john', 'jane'])
  })

  it('supports a multi-player tie', () => {
    const active = session({
      scoreEvents: [
        event('one', 'mill', 10),
        event('two', 'john', 10),
        event('three', 'jane', 10),
      ],
    })

    expect(new WinnerEngine().getWinners(active)).toHaveLength(3)
    expect(new WinnerEngine().isTie(active)).toBe(true)
  })

  it('treats zero-point events as a genuine all-player tie', () => {
    const active = session({
      scoreEvents: [
        event('one', 'mill', 0),
        event('two', 'john', 0),
        event('three', 'jane', 0),
      ],
    })

    const result = new WinnerEngine().evaluate(active)

    expect(result.winners).toHaveLength(3)
    expect(result.standings.every(({ rank }) => rank === 1)).toBe(true)
  })
})

describe('WinnerEngine result semantics', () => {
  it('returns zero standings but no winner for empty score history', () => {
    const result = new WinnerEngine().evaluate(session())

    expect(result.standings.map(({ total }) => total)).toEqual([0, 0, 0])
    expect(result.standings.every(({ isWinner }) => !isWinner)).toBe(true)
    expect(result.winners).toEqual([])
    expect(result.isTie).toBe(false)
  })

  it('returns a singular winner only for non-tied results', () => {
    const single = session({
      scoreEvents: [event('one', 'mill', 2), event('two', 'john', 1)],
    })
    const tied = session({
      scoreEvents: [event('one', 'mill', 1), event('two', 'john', 1)],
    })

    expect(new WinnerEngine().getWinner(single)?.playerId).toBe('mill')
    expect(new WinnerEngine().getWinner(tied)).toBeUndefined()
  })

  it('does not mutate session, template, players, or events', () => {
    const active = session({
      scoreEvents: [event('one', 'mill', 10), event('two', 'john', 5)],
    })
    const before = structuredClone(active)

    new WinnerEngine().evaluate(active)

    expect(active).toEqual(before)
  })
})

describe('WinnerEngine validation', () => {
  it('rejects missing sessions and templates', () => {
    expectCode('MISSING_SESSION', () => new WinnerEngine().evaluate(null))

    const missingTemplate = {
      ...session(),
      template: undefined,
    } as unknown as GameSession
    expectCode('MISSING_TEMPLATE', () =>
      new WinnerEngine().evaluate(missingTemplate),
    )
  })

  it('rejects unsupported winner rules', () => {
    const unsupported = session({
      template: template({ winnerRule: 'unsupported' as WinnerRule }),
    })

    expectCode('UNSUPPORTED_WINNER_RULE', () =>
      new WinnerEngine().evaluate(unsupported),
    )
  })

  it('maps invalid templates and sessions from ScoreEngine', () => {
    const invalidTemplate = session({
      template: { ...template(), name: '' },
    })
    const duplicatePlayers = session({
      players: [
        { id: 'same', name: 'One' },
        { id: 'same', name: 'Two' },
      ],
    })

    const templateError = expectCode('INVALID_TEMPLATE', () =>
      new WinnerEngine().evaluate(invalidTemplate),
    )
    expect(templateError.cause).toBeInstanceOf(ScoreEngineError)
    expectCode('INVALID_SESSION', () =>
      new WinnerEngine().evaluate(duplicatePlayers),
    )
  })

  it('rejects invalid ScoreEngine output', () => {
    const active = session()
    const validFirst: PlayerStanding = {
      playerId: 'mill',
      playerName: 'Mill',
      total: 10,
      rank: 1,
    }

    const invalidOutputs: readonly (readonly PlayerStanding[])[] = [
      [],
      [
        validFirst,
        { playerId: 'john', playerName: 'Wrong', total: 5, rank: 2 },
        { playerId: 'jane', playerName: 'Jane', total: 1, rank: 3 },
      ],
      [
        { ...validFirst, total: Number.NaN },
        { playerId: 'john', playerName: 'John', total: 5, rank: 2 },
        { playerId: 'jane', playerName: 'Jane', total: 1, rank: 3 },
      ],
      [
        { ...validFirst, rank: 2 },
        { playerId: 'john', playerName: 'John', total: 5, rank: 1 },
        { playerId: 'jane', playerName: 'Jane', total: 1, rank: 3 },
      ],
      [
        validFirst,
        { ...validFirst, rank: 2 },
        { playerId: 'jane', playerName: 'Jane', total: 1, rank: 3 },
      ],
    ]

    for (const output of invalidOutputs) {
      expectCode('INVALID_SCORE_OUTPUT', () =>
        new WinnerEngine(provider(output)).evaluate(active),
      )
    }
  })

  it('maps missing-session provider errors and preserves unknown errors', () => {
    const missingProvider: StandingsProvider = {
      getStandings: () => {
        throw new ScoreEngineError('MISSING_SESSION', 'Missing downstream.')
      },
    }
    expectCode('MISSING_SESSION', () =>
      new WinnerEngine(missingProvider).evaluate(session()),
    )

    const unknownProvider: StandingsProvider = {
      getStandings: () => {
        throw new Error('Unexpected provider failure.')
      },
    }
    expect(() => new WinnerEngine(unknownProvider).evaluate(session())).toThrow(
      'Unexpected provider failure.',
    )
  })
})
