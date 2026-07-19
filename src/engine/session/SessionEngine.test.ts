import { describe, expect, it } from 'vitest'

import type { GameTemplate, ScoreEvent } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import { TemplateEngine, type TemplateValidationResult } from '../template'
import { SessionEngine } from './SessionEngine'
import {
  SessionEngineError,
  type SessionEngineErrorCode,
} from './SessionEngineError'

const customTemplate = (
  overrides: Partial<GameTemplate> = {},
): GameTemplate => ({
  id: 'custom-game',
  name: 'Custom Game',
  description: 'Session Engine test template.',
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

const createEngine = (
  template: GameTemplate = customTemplate(),
): SessionEngine => {
  const templateEngine = new TemplateEngine([])
  templateEngine.loadTemplates([template])
  return new SessionEngine({ templateEngine })
}

const createWithPlayers = (
  engine: SessionEngine,
  sessionId = 'session-1',
): SessionEngine => {
  engine.createSession({ id: sessionId, templateId: 'custom-game' })
  engine.addPlayer({ id: 'mill', name: 'Mill' })
  engine.addPlayer({ id: 'john', name: 'John' })
  return engine
}

const startGame = (engine = createEngine()): SessionEngine => {
  createWithPlayers(engine)
  engine.startGame('2026-01-01T00:00:00.000Z')
  return engine
}

const score = (
  id: string,
  playerId: string,
  points: number,
  roundId?: string,
): ScoreEvent => ({
  id,
  playerId,
  roundId,
  type: ScoreEventType.Score,
  points,
  createdAt: '2026-01-01T00:01:00.000Z',
})

const action = (id: string) => ({
  id,
  timestamp: '2026-01-01T00:02:00.000Z',
})

const expectCode = (
  code: SessionEngineErrorCode,
  operation: () => unknown,
): SessionEngineError => {
  try {
    operation()
  } catch (error) {
    expect(error).toBeInstanceOf(SessionEngineError)
    expect((error as SessionEngineError).code).toBe(code)
    return error as SessionEngineError
  }
  throw new Error(`Expected ${code}.`)
}

describe('SessionEngine lifecycle', () => {
  it('creates a not-started session from a validated template', () => {
    const engine = new SessionEngine()

    const created = engine.createSession({
      id: 'session-1',
      templateId: 'scrabble',
    })

    expect(created).toMatchObject({
      id: 'session-1',
      status: GameSessionStatus.NotStarted,
      template: { id: 'scrabble' },
      players: [],
      rounds: [],
      scoreEvents: [],
    })
    expect(engine.isGameComplete()).toBe(false)
    expect(engine.getCurrentRound()).toBeUndefined()
  })

  it('starts and completes a game with explicit transitions', () => {
    const engine = createWithPlayers(createEngine())

    const active = engine.startGame('2026-01-01T00:00:00.000Z')
    const completed = engine.endGame('2026-01-01T01:00:00.000Z')

    expect(active.status).toBe(GameSessionStatus.Active)
    expect(active.startedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(completed.session.status).toBe(GameSessionStatus.Completed)
    expect(completed.session.completedAt).toBe('2026-01-01T01:00:00.000Z')
    expect(completed.winner.winners).toEqual([])
    expect(engine.isGameComplete()).toBe(true)
  })

  it('resets scores for play again while keeping template and players', () => {
    const engine = startGame()
    engine.addScore(score('one', 'mill', 10), action('add-one'))
    engine.endGame('2026-01-01T01:00:00.000Z')

    const replay = engine.resetScores('session-2')

    expect(replay).toMatchObject({
      id: 'session-2',
      status: GameSessionStatus.NotStarted,
      template: { id: 'custom-game' },
      players: [
        { id: 'mill', name: 'Mill' },
        { id: 'john', name: 'John' },
      ],
      rounds: [],
      scoreEvents: [],
    })
    expect(replay.startedAt).toBeUndefined()
    expect(replay.completedAt).toBeUndefined()
  })

  it('returns current session and snapshot as defensive copies', () => {
    const engine = createWithPlayers(createEngine())
    const returned = engine.getCurrentSession() as unknown as {
      players: { name: string }[]
      template: { name: string }
    }
    returned.players[0]!.name = 'Changed'
    returned.template.name = 'Changed Template'

    expect(engine.getCurrentSession()).toMatchObject({
      template: { name: 'Custom Game' },
      players: [{ name: 'Mill' }, { name: 'John' }],
    })
    expect(engine.getSnapshot()?.session.id).toBe('session-1')
  })

  it('resumes a valid persisted session and discards it safely', () => {
    const source = startGame()
    source.addScore(score('one', 'mill', 10), action('add-one'))
    const persisted = source.getCurrentSession()!
    const engine = createEngine()

    const resumed = engine.resumeSession(persisted)

    expect(resumed).toEqual(persisted)
    expect(engine.canUndo()).toBe(false)
    ;(
      persisted as unknown as { players: { name: string }[] }
    ).players[0]!.name = 'Changed'
    expect(engine.getCurrentSession()?.players[0]?.name).toBe('Mill')

    engine.discardSession()
    expect(engine.getCurrentSession()).toBeUndefined()
  })

  it('rejects invalid and completed persisted sessions', () => {
    const source = startGame()
    source.addScore(score('one', 'mill', 10), action('add-one'))
    const active = source.getCurrentSession()!
    const engine = createEngine()

    expectCode('INVALID_SESSION', () =>
      engine.resumeSession({ ...active, players: [] }),
    )
    expectCode('INVALID_TRANSITION', () =>
      engine.resumeSession({
        ...active,
        status: GameSessionStatus.Completed,
        completedAt: '2026-01-01T01:00:00.000Z',
      }),
    )
  })
})

describe('SessionEngine player management', () => {
  it('adds, renames, and removes players before start', () => {
    const engine = createEngine()
    engine.createSession({ id: 'session-1', templateId: 'custom-game' })

    engine.addPlayer({ id: 'mill', name: 'Mill' })
    engine.addPlayer({ id: 'john', name: 'John' })
    engine.renamePlayer('john', 'Johnny')
    const updated = engine.removePlayer('mill')

    expect(updated.players).toEqual([{ id: 'john', name: 'Johnny' }])
  })

  it('validates player identity, uniqueness, existence, and maximum', () => {
    const engine = createEngine(customTemplate({ maximumPlayers: 2 }))
    engine.createSession({ id: 'session-1', templateId: 'custom-game' })

    expectCode('INVALID_PLAYER', () =>
      engine.addPlayer({ id: '', name: 'Invalid' }),
    )
    engine.addPlayer({ id: 'mill', name: 'Mill' })
    expectCode('DUPLICATE_PLAYER', () =>
      engine.addPlayer({ id: 'mill', name: 'Duplicate' }),
    )
    expectCode('DUPLICATE_PLAYER_NAME', () =>
      engine.addPlayer({ id: 'other', name: ' mill ' }),
    )
    expectCode('PLAYER_NOT_FOUND', () => engine.removePlayer('missing'))
    expectCode('INVALID_PLAYER', () => engine.renamePlayer('mill', ' '))
    engine.addPlayer({ id: 'john', name: 'John' })
    expectCode('DUPLICATE_PLAYER_NAME', () =>
      engine.renamePlayer('john', 'MILL'),
    )
    expectCode('PLAYER_LIMIT', () =>
      engine.addPlayer({ id: 'jane', name: 'Jane' }),
    )
  })

  it('requires minimum players and locks player changes after start', () => {
    const engine = createEngine()
    engine.createSession({ id: 'session-1', templateId: 'custom-game' })
    engine.addPlayer({ id: 'mill', name: 'Mill' })
    expectCode('PLAYER_LIMIT', () =>
      engine.startGame('2026-01-01T00:00:00.000Z'),
    )
    engine.addPlayer({ id: 'john', name: 'John' })
    engine.startGame('2026-01-01T00:00:00.000Z')

    expectCode('INVALID_TRANSITION', () =>
      engine.addPlayer({ id: 'jane', name: 'Jane' }),
    )
    expectCode('INVALID_TRANSITION', () => engine.removePlayer('mill'))
    expectCode('INVALID_TRANSITION', () =>
      engine.renamePlayer('mill', 'New Name'),
    )
  })
})

describe('SessionEngine rounds', () => {
  it('advances rounds and closes the previous round', () => {
    const engine = startGame()

    engine.nextRound({
      id: 'round-1',
      startedAt: '2026-01-01T00:10:00.000Z',
    })
    const current = engine.nextRound({
      id: 'round-2',
      startedAt: '2026-01-01T00:20:00.000Z',
    })

    expect(current.rounds).toEqual([
      {
        id: 'round-1',
        number: 1,
        startedAt: '2026-01-01T00:10:00.000Z',
        completedAt: '2026-01-01T00:20:00.000Z',
      },
      {
        id: 'round-2',
        number: 2,
        startedAt: '2026-01-01T00:20:00.000Z',
      },
    ])
    expect(engine.getCurrentRound()?.id).toBe('round-2')
    expect(engine.getSnapshot()?.currentRound?.id).toBe('round-2')
  })

  it('supports fixed round limits', () => {
    const engine = startGame(
      createEngine(
        customTemplate({
          roundConfiguration: { type: RoundType.Fixed, totalRounds: 1 },
        }),
      ),
    )
    engine.nextRound({
      id: 'round-1',
      startedAt: '2026-01-01T00:10:00.000Z',
    })

    expectCode('ROUND_LIMIT', () =>
      engine.nextRound({
        id: 'round-2',
        startedAt: '2026-01-01T00:20:00.000Z',
      }),
    )
  })

  it('rejects invalid, duplicate, and inactive round changes', () => {
    const setup = createWithPlayers(createEngine())
    expectCode('INVALID_TRANSITION', () =>
      setup.nextRound({ id: 'round-1', startedAt: 'time' }),
    )
    setup.startGame('2026-01-01T00:00:00.000Z')
    expectCode('INVALID_ROUND', () =>
      setup.nextRound({ id: '', startedAt: 'time' }),
    )
    setup.nextRound({ id: 'round-1', startedAt: 'time' })
    expectCode('INVALID_ROUND', () =>
      setup.nextRound({ id: 'round-1', startedAt: 'later' }),
    )
  })
})

describe('SessionEngine engine coordination', () => {
  it('records running-total player scores without assigning a round', () => {
    const engine = startGame()

    engine.addPlayerScore(
      {
        id: 'one',
        playerId: 'mill',
        points: 12,
        createdAt: '2026-01-01T00:01:00.000Z',
      },
      action('add-one'),
    )

    expect(engine.getCurrentSession()?.scoreEvents[0]).toMatchObject({
      playerId: 'mill',
      points: 12,
      roundId: undefined,
    })
  })

  it('assigns per-round player scores and exposes round projections', () => {
    const engine = startGame(
      createEngine(customTemplate({ scoringType: ScoringType.PerRound })),
    )
    expectCode('INVALID_ROUND', () =>
      engine.addPlayerScore(
        {
          id: 'one',
          playerId: 'mill',
          points: 10,
          createdAt: 'time',
        },
        action('add-one'),
      ),
    )
    engine.nextRound({ id: 'round-1', startedAt: 'time' })

    engine.addPlayerScore(
      { id: 'one', playerId: 'mill', points: 10, createdAt: 'time' },
      action('add-one'),
    )

    expect(engine.getCurrentSession()?.scoreEvents[0]?.roundId).toBe('round-1')
    expect(engine.getCurrentRoundScores()).toMatchObject([
      { playerId: 'mill', total: 10 },
      { playerId: 'john', total: 0 },
    ])
  })

  it('coordinates score entry and WinnerEngine standings', () => {
    const engine = startGame()
    engine.addScore(score('one', 'mill', 12), action('add-one'))
    engine.addScore(score('two', 'john', 8), action('add-two'))

    expect(engine.getCurrentStandings()).toMatchObject([
      { playerId: 'mill', total: 12, rank: 1, isWinner: true },
      { playerId: 'john', total: 8, rank: 2, isWinner: false },
    ])
    expect(engine.getWinner()?.playerId).toBe('mill')
  })

  it('coordinates update, delete, and consecutive undo operations', () => {
    const engine = startGame()
    engine.addScore(score('one', 'mill', 10), action('add-one'))
    engine.updateScore(score('one', 'mill', 20), action('update-one'))
    engine.deleteScore('one', action('delete-one'))

    expect(engine.getCurrentSession()?.scoreEvents).toEqual([])
    expect(engine.undoLastAction().session.scoreEvents[0]?.points).toBe(20)
    expect(engine.undoLastAction().session.scoreEvents[0]?.points).toBe(10)
    expect(engine.undoLastAction().session.scoreEvents).toEqual([])
  })

  it('coordinates per-round score validation through ScoreEngine', () => {
    const engine = startGame(
      createEngine(customTemplate({ scoringType: ScoringType.PerRound })),
    )
    expectCode('INVALID_SCORE_OPERATION', () =>
      engine.addScore(score('one', 'mill', 10), action('add-one')),
    )
    engine.nextRound({ id: 'round-1', startedAt: 'time' })

    expect(
      engine.addScore(score('one', 'mill', 10, 'round-1'), action('add-one'))
        .scoreEvents,
    ).toHaveLength(1)
  })

  it('clears undo history after completion and reset', () => {
    const engine = startGame()
    engine.addScore(score('one', 'mill', 10), action('add-one'))
    engine.endGame('2026-01-01T01:00:00.000Z')
    engine.resetScores('session-2')
    engine.startGame('2026-01-02T00:00:00.000Z')

    expectCode('UNDO_FAILED', () => engine.undoLastAction())
  })
})

describe('SessionEngine transition validation', () => {
  it('rejects operations without a session', () => {
    const engine = createEngine()
    expect(engine.getCurrentSession()).toBeUndefined()
    expect(engine.getSnapshot()).toBeUndefined()
    expectCode('MISSING_SESSION', () => engine.getCurrentRound())
    expectCode('MISSING_SESSION', () => engine.startGame('time'))
  })

  it('rejects missing templates, invalid IDs, and duplicate sessions', () => {
    const engine = createEngine()
    expectCode('TEMPLATE_NOT_FOUND', () =>
      engine.createSession({ id: 'session-1', templateId: 'missing' }),
    )
    expectCode('INVALID_TRANSITION', () =>
      engine.createSession({ id: '', templateId: 'custom-game' }),
    )
    engine.createSession({ id: 'session-1', templateId: 'custom-game' })
    expectCode('SESSION_ALREADY_EXISTS', () =>
      engine.createSession({ id: 'session-2', templateId: 'custom-game' }),
    )
  })

  it('rejects invalid lifecycle transitions and timestamps', () => {
    const engine = createWithPlayers(createEngine())
    expectCode('INVALID_TRANSITION', () => engine.endGame('time'))
    expectCode('INVALID_TRANSITION', () => engine.startGame(''))
    engine.startGame('start')
    expectCode('INVALID_TRANSITION', () => engine.startGame('again'))
    expectCode('INVALID_TRANSITION', () => engine.endGame(''))
    expectCode('INVALID_TRANSITION', () => engine.resetScores('session-2'))
    engine.endGame('end')
    expectCode('INVALID_TRANSITION', () => engine.resetScores('session-1'))
  })

  it('rejects invalid score actions and missing score events', () => {
    const engine = startGame()
    expectCode('INVALID_SCORE_OPERATION', () =>
      engine.addScore(score('one', 'missing', 10), action('add-one')),
    )
    expectCode('INVALID_SCORE_OPERATION', () =>
      engine.addScore(score('one', 'mill', 10), action('')),
    )
    expectCode('INVALID_SCORE_OPERATION', () =>
      engine.updateScore(score('missing', 'mill', 10), action('update')),
    )
    expectCode('INVALID_SCORE_OPERATION', () =>
      engine.deleteScore('missing', action('delete')),
    )
  })

  it('rejects invalid templates returned by a template provider', () => {
    class InvalidTemplateEngine extends TemplateEngine {
      override getTemplate(): GameTemplate {
        return { ...customTemplate(), name: '' }
      }

      override validateTemplate(): TemplateValidationResult {
        return {
          valid: false,
          errors: [{ field: 'name', message: 'name is invalid.' }],
        }
      }
    }

    const engine = new SessionEngine({
      templateEngine: new InvalidTemplateEngine([]),
    })
    expectCode('INVALID_TEMPLATE', () =>
      engine.createSession({ id: 'session-1', templateId: 'invalid' }),
    )
  })
})
