import { describe, expect, it } from 'vitest'

import type { GameSession, GameTemplate, Round, ScoreEvent } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import { ScoreEngine } from './ScoreEngine'
import { ScoreEngineError, type ScoreEngineErrorCode } from './ScoreEngineError'

const template = (overrides: Partial<GameTemplate> = {}): GameTemplate => ({
  id: 'test-game',
  name: 'Test Game',
  description: 'Test scoring template.',
  icon: 'test',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
  ...overrides,
})

const round = (number: number): Round => ({
  id: `round-${number}`,
  number,
  startedAt: `2026-01-0${number}T00:00:00.000Z`,
})

const scoreEvent = (
  id: string,
  playerId: string,
  points: number,
  roundId: string | undefined = 'round-1',
): ScoreEvent => ({
  id,
  playerId,
  roundId,
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
    { id: 'alex', name: 'Alex' },
  ],
  rounds: [round(1), round(2)],
  scoreEvents: [],
  status: GameSessionStatus.Active,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const expectCode = (
  code: ScoreEngineErrorCode,
  action: () => unknown,
): ScoreEngineError => {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(ScoreEngineError)
    expect((error as ScoreEngineError).code).toBe(code)
    return error as ScoreEngineError
  }
  throw new Error(`Expected ${code}.`)
}

describe('ScoreEngine event mutations', () => {
  it('adds an immutable score event without changing the source session', () => {
    const engine = new ScoreEngine()
    const original = session()
    const event = scoreEvent('event-1', 'mill', 10)

    const updated = engine.addScoreEvent(original, event)

    expect(original.scoreEvents).toEqual([])
    expect(updated.scoreEvents).toEqual([event])
    expect(updated).not.toBe(original)
  })

  it('updates an event in place without changing history order', () => {
    const engine = new ScoreEngine()
    const original = session({
      scoreEvents: [
        scoreEvent('event-1', 'mill', 10),
        scoreEvent('event-2', 'john', 20),
      ],
    })

    const updated = engine.updateScoreEvent(
      original,
      scoreEvent('event-1', 'mill', 15),
    )

    expect(updated.scoreEvents.map(({ id }) => id)).toEqual([
      'event-1',
      'event-2',
    ])
    expect(updated.scoreEvents[0]?.points).toBe(15)
    expect(original.scoreEvents[0]?.points).toBe(10)
  })

  it('removes an event without changing the source session', () => {
    const engine = new ScoreEngine()
    const original = session({
      scoreEvents: [
        scoreEvent('event-1', 'mill', 10),
        scoreEvent('event-2', 'john', 20),
      ],
    })

    const updated = engine.removeScoreEvent(original, 'event-1')

    expect(updated.scoreEvents.map(({ id }) => id)).toEqual(['event-2'])
    expect(original.scoreEvents).toHaveLength(2)
  })

  it('rejects duplicate and missing event IDs', () => {
    const engine = new ScoreEngine()
    const active = session({
      scoreEvents: [scoreEvent('event-1', 'mill', 10)],
    })

    expectCode('DUPLICATE_EVENT', () =>
      engine.addScoreEvent(active, scoreEvent('event-1', 'john', 5)),
    )
    expectCode('EVENT_NOT_FOUND', () =>
      engine.updateScoreEvent(active, scoreEvent('missing', 'mill', 5)),
    )
    expectCode('EVENT_NOT_FOUND', () =>
      engine.removeScoreEvent(active, 'missing'),
    )
  })

  it('rejects mutations after session completion', () => {
    const engine = new ScoreEngine()
    const completed = session({ status: GameSessionStatus.Completed })

    const error = expectCode('SESSION_NOT_ACTIVE', () =>
      engine.addScoreEvent(completed, scoreEvent('event-1', 'mill', 10)),
    )
    expect(error.message).toContain('session-1')
  })
})

describe('ScoreEngine projections', () => {
  it('calculates running totals from score and correction events', () => {
    const engine = new ScoreEngine()
    const active = session({
      scoreEvents: [
        scoreEvent('event-1', 'mill', 12, undefined),
        scoreEvent('event-2', 'mill', 9, undefined),
        {
          ...scoreEvent('event-3', 'mill', -2, undefined),
          type: ScoreEventType.Correction,
        },
        scoreEvent('event-4', 'john', 15, undefined),
      ],
    })

    expect(engine.getPlayerTotal(active, 'mill')).toBe(19)
    expect(engine.getAllPlayerTotals(active)).toEqual([
      { playerId: 'mill', playerName: 'Mill', total: 19 },
      { playerId: 'john', playerName: 'John', total: 15 },
      { playerId: 'alex', playerName: 'Alex', total: 0 },
    ])
  })

  it('calculates per-round scores, round totals, and overall totals', () => {
    const engine = new ScoreEngine()
    const active = session({
      template: template({ scoringType: ScoringType.PerRound }),
      scoreEvents: [
        scoreEvent('event-1', 'mill', 10, 'round-1'),
        scoreEvent('event-2', 'john', 15, 'round-1'),
        scoreEvent('event-3', 'mill', 8, 'round-2'),
        scoreEvent('event-4', 'john', 12, 'round-2'),
      ],
    })

    expect(engine.getRoundScores(active, 'round-1')).toEqual([
      { playerId: 'mill', playerName: 'Mill', total: 10 },
      { playerId: 'john', playerName: 'John', total: 15 },
      { playerId: 'alex', playerName: 'Alex', total: 0 },
    ])
    expect(engine.getRoundTotal(active, 'round-1')).toBe(25)
    expect(engine.getPlayerTotal(active, 'mill')).toBe(18)
    expect(engine.getRoundSummaries(active).map(({ total }) => total)).toEqual([
      25, 20,
    ])
  })

  it('calculates deterministic highest-score standings with ties', () => {
    const engine = new ScoreEngine()
    const active = session({
      scoreEvents: [
        scoreEvent('event-1', 'mill', 20),
        scoreEvent('event-2', 'john', 10),
        scoreEvent('event-3', 'alex', 20),
      ],
    })

    expect(engine.getStandings(active)).toEqual([
      { playerId: 'mill', playerName: 'Mill', total: 20, rank: 1 },
      { playerId: 'alex', playerName: 'Alex', total: 20, rank: 1 },
      { playerId: 'john', playerName: 'John', total: 10, rank: 3 },
    ])
  })

  it('orders standings for lowest-score templates', () => {
    const engine = new ScoreEngine()
    const active = session({
      template: template({ winnerRule: WinnerRule.LowestScore }),
      scoreEvents: [
        scoreEvent('event-1', 'mill', 20),
        scoreEvent('event-2', 'john', 10),
      ],
    })

    expect(engine.getStandings(active).map(({ playerId }) => playerId)).toEqual(
      ['alex', 'john', 'mill'],
    )
  })

  it('returns empty projections for an empty session', () => {
    const calculation = new ScoreEngine().recalculate(
      session({ players: [], rounds: [], scoreEvents: [] }),
    )

    expect(calculation).toEqual({
      playerTotals: [],
      standings: [],
      roundSummaries: [],
      scoreHistory: [],
    })
  })

  it('returns all or player-specific history as copies', () => {
    const engine = new ScoreEngine()
    const active = session({
      scoreEvents: [
        scoreEvent('event-1', 'mill', 10),
        scoreEvent('event-2', 'john', 15),
      ],
    })

    expect(engine.getScoreHistory(active)).toHaveLength(2)
    expect(engine.getScoreHistory(active, 'mill')).toEqual([
      scoreEvent('event-1', 'mill', 10),
    ])
    expect(engine.getScoreHistory(active)[0]).not.toBe(active.scoreEvents[0])
  })

  it('handles many rounds and events deterministically', () => {
    const rounds = Array.from({ length: 100 }, (_, index) => round(index + 1))
    const events = rounds.flatMap((currentRound, index) => [
      scoreEvent(`mill-${index}`, 'mill', 1, currentRound.id),
      scoreEvent(`john-${index}`, 'john', 2, currentRound.id),
    ])
    const active = session({ rounds, scoreEvents: events })

    const result = new ScoreEngine().recalculate(active)

    expect(result.playerTotals[0]?.total).toBe(100)
    expect(result.playerTotals[1]?.total).toBe(200)
    expect(result.roundSummaries).toHaveLength(100)
  })
})

describe('ScoreEngine validation', () => {
  it('rejects a missing session', () => {
    expectCode('MISSING_SESSION', () =>
      new ScoreEngine().recalculate(undefined),
    )
  })

  it('rejects invalid templates', () => {
    const invalidTemplate = {
      ...template(),
      scoringType: 'invalid',
    } as unknown as GameTemplate

    expectCode('INVALID_TEMPLATE', () =>
      new ScoreEngine().recalculate(session({ template: invalidTemplate })),
    )
  })

  it('rejects unknown players', () => {
    const engine = new ScoreEngine()
    const active = session()

    expectCode('PLAYER_NOT_FOUND', () =>
      engine.addScoreEvent(active, scoreEvent('event-1', 'missing', 10)),
    )
    expectCode('PLAYER_NOT_FOUND', () =>
      engine.getPlayerTotal(active, 'missing'),
    )
    expectCode('PLAYER_NOT_FOUND', () =>
      engine.getScoreHistory(active, 'missing'),
    )
  })

  it('rejects missing and unknown rounds for per-round scoring', () => {
    const engine = new ScoreEngine()
    const active = session({
      template: template({ scoringType: ScoringType.PerRound }),
    })

    expectCode('INVALID_ROUND', () =>
      engine.addScoreEvent(active, {
        ...scoreEvent('event-1', 'mill', 10),
        roundId: undefined,
      }),
    )
    expectCode('INVALID_ROUND', () =>
      engine.addScoreEvent(
        active,
        scoreEvent('event-1', 'mill', 10, 'missing'),
      ),
    )
    expectCode('INVALID_ROUND', () => engine.getRoundScores(active, 'missing'))
  })

  it('rejects non-finite scores, empty IDs, and unknown event types', () => {
    const engine = new ScoreEngine()
    const active = session()

    expectCode('INVALID_EVENT', () =>
      engine.addScoreEvent(active, scoreEvent('event-1', 'mill', Number.NaN)),
    )
    expectCode('INVALID_EVENT', () =>
      engine.addScoreEvent(active, scoreEvent(' ', 'mill', 10)),
    )
    expectCode('INVALID_EVENT', () =>
      engine.addScoreEvent(active, {
        ...scoreEvent('event-1', 'mill', 10),
        type: 'invalid' as ScoreEventType,
      }),
    )
  })

  it('rejects duplicate or empty player IDs', () => {
    const engine = new ScoreEngine()

    expectCode('INVALID_SESSION', () =>
      engine.recalculate(
        session({
          players: [
            { id: 'same', name: 'One' },
            { id: 'same', name: 'Two' },
          ],
        }),
      ),
    )
    expectCode('INVALID_SESSION', () =>
      engine.recalculate(session({ players: [{ id: '', name: 'Empty' }] })),
    )
  })

  it('rejects invalid, duplicate, and out-of-range rounds', () => {
    const engine = new ScoreEngine()

    expectCode('INVALID_ROUND', () =>
      engine.recalculate(session({ rounds: [{ ...round(1), number: 0 }] })),
    )
    expectCode('INVALID_ROUND', () =>
      engine.recalculate(
        session({ rounds: [round(1), { ...round(2), number: 1 }] }),
      ),
    )
    expectCode('INVALID_ROUND', () =>
      engine.recalculate(
        session({ rounds: [round(1), { ...round(2), id: 'round-1' }] }),
      ),
    )
    expectCode('INVALID_ROUND', () =>
      engine.recalculate(
        session({
          template: template({
            roundConfiguration: { type: RoundType.Fixed, totalRounds: 1 },
          }),
          rounds: [round(2)],
        }),
      ),
    )
  })

  it('rejects duplicated or otherwise invalid stored events', () => {
    const engine = new ScoreEngine()
    const duplicate = scoreEvent('same', 'mill', 10)

    expectCode('INVALID_SESSION', () =>
      engine.recalculate(
        session({ scoreEvents: [duplicate, { ...duplicate, points: 20 }] }),
      ),
    )
    expectCode('PLAYER_NOT_FOUND', () =>
      engine.recalculate(
        session({
          scoreEvents: [scoreEvent('event-1', 'missing', 10)],
        }),
      ),
    )
  })
})
