import { describe, expect, it } from 'vitest'

import type { GameSession, GameTemplate, ScoreEvent } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import { ScoreEngine } from '../score'
import { UndoEngine } from './UndoEngine'
import { UndoEngineError, type UndoEngineErrorCode } from './UndoEngineError'
import {
  UndoActionType,
  type AddScoreEventAction,
  type DeleteScoreEventAction,
  type UndoAction,
  type UpdateScoreEventAction,
} from './types'

const template = (): GameTemplate => ({
  id: 'undo-test',
  name: 'Undo Test',
  description: 'Template for UndoEngine tests.',
  icon: 'history',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
})

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  template: template(),
  players: [
    { id: 'mill', name: 'Mill' },
    { id: 'john', name: 'John' },
  ],
  rounds: [],
  scoreEvents: [],
  status: GameSessionStatus.Active,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const event = (id: string, playerId: string, points: number): ScoreEvent => ({
  id,
  playerId,
  type: ScoreEventType.Score,
  points,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const addAction = (
  currentEvent: ScoreEvent,
  id = `add-${currentEvent.id}`,
): AddScoreEventAction => ({
  id,
  sessionId: 'session-1',
  type: UndoActionType.AddScoreEvent,
  timestamp: '2026-01-01T00:01:00.000Z',
  previousEvent: null,
  currentEvent,
})

const updateAction = (
  previousEvent: ScoreEvent,
  currentEvent: ScoreEvent,
  id = `update-${currentEvent.id}`,
): UpdateScoreEventAction => ({
  id,
  sessionId: 'session-1',
  type: UndoActionType.UpdateScoreEvent,
  timestamp: '2026-01-01T00:02:00.000Z',
  previousEvent,
  currentEvent,
})

const deleteAction = (
  previousEvent: ScoreEvent,
  eventIndex: number,
  id = `delete-${previousEvent.id}`,
): DeleteScoreEventAction => ({
  id,
  sessionId: 'session-1',
  type: UndoActionType.DeleteScoreEvent,
  timestamp: '2026-01-01T00:03:00.000Z',
  previousEvent,
  currentEvent: null,
  eventIndex,
})

const expectCode = (
  code: UndoEngineErrorCode,
  action: () => unknown,
): UndoEngineError => {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(UndoEngineError)
    expect((error as UndoEngineError).code).toBe(code)
    return error as UndoEngineError
  }
  throw new Error(`Expected ${code}.`)
}

describe('UndoEngine history', () => {
  it('records actions in insertion order', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const first = event('one', 'mill', 10)
    const afterFirst = scoreEngine.addScoreEvent(session(), first)
    undoEngine.recordAction(afterFirst, addAction(first))
    const second = event('two', 'john', 5)
    const afterSecond = scoreEngine.addScoreEvent(afterFirst, second)
    undoEngine.recordAction(afterSecond, addAction(second))

    expect(undoEngine.canUndo()).toBe(true)
    expect(undoEngine.getHistory().map(({ id }) => id)).toEqual([
      'add-one',
      'add-two',
    ])
  })

  it('returns defensive history copies', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, {
      ...addAction(added),
      metadata: { source: 'score-entry' },
    })

    const copy = undoEngine.getHistory()[0] as unknown as {
      currentEvent: { points: number }
      metadata: { source: string }
    }
    copy.currentEvent.points = 999
    copy.metadata.source = 'changed'

    expect(undoEngine.getHistory()[0]).toMatchObject({
      currentEvent: { points: 10 },
      metadata: { source: 'score-entry' },
    })
  })

  it('clears history', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, addAction(added))

    undoEngine.clearHistory()

    expect(undoEngine.canUndo()).toBe(false)
    expect(undoEngine.getHistory()).toEqual([])
  })

  it('rejects duplicate action IDs', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, addAction(added))

    expectCode('DUPLICATE_ACTION', () =>
      undoEngine.recordAction(active, addAction(added)),
    )
  })
})

describe('UndoEngine restoration', () => {
  it('undoes an added score event and recalculates totals', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, addAction(added))

    const result = undoEngine.undo(active)

    expect(result.session).toEqual(session())
    expect(result.calculation.playerTotals.map(({ total }) => total)).toEqual([
      0, 0,
    ])
    expect(result.action.id).toBe('add-one')
    expect(undoEngine.canUndo()).toBe(false)
  })

  it('undoes an updated score event', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const previous = event('one', 'mill', 10)
    const beforeUpdate = scoreEngine.addScoreEvent(session(), previous)
    const current = event('one', 'mill', 25)
    const afterUpdate = scoreEngine.updateScoreEvent(beforeUpdate, current)
    undoEngine.recordAction(afterUpdate, updateAction(previous, current))

    const result = undoEngine.undo(afterUpdate)

    expect(result.session).toEqual(beforeUpdate)
    expect(result.calculation.playerTotals[0]?.total).toBe(10)
  })

  it('undoes deletion at the exact original history position', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const first = event('one', 'mill', 10)
    const deleted = event('two', 'john', 5)
    const third = event('three', 'mill', 7)
    const beforeDelete = session({ scoreEvents: [first, deleted, third] })
    const afterDelete = scoreEngine.removeScoreEvent(beforeDelete, deleted.id)
    undoEngine.recordAction(afterDelete, deleteAction(deleted, 1))

    const result = undoEngine.undo(afterDelete)

    expect(result.session).toEqual(beforeDelete)
    expect(result.calculation.playerTotals.map(({ total }) => total)).toEqual([
      17, 5,
    ])
  })

  it('supports multiple consecutive undos', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const original = session()
    const added = event('one', 'mill', 10)
    const afterAdd = scoreEngine.addScoreEvent(original, added)
    undoEngine.recordAction(afterAdd, addAction(added))
    const updated = event('one', 'mill', 20)
    const afterUpdate = scoreEngine.updateScoreEvent(afterAdd, updated)
    undoEngine.recordAction(afterUpdate, updateAction(added, updated))
    const afterDelete = scoreEngine.removeScoreEvent(afterUpdate, updated.id)
    undoEngine.recordAction(afterDelete, deleteAction(updated, 0))

    const restoredUpdate = undoEngine.undo(afterDelete).session
    const restoredAdd = undoEngine.undo(restoredUpdate).session
    const restoredOriginal = undoEngine.undo(restoredAdd).session

    expect(restoredUpdate).toEqual(afterUpdate)
    expect(restoredAdd).toEqual(afterAdd)
    expect(restoredOriginal).toEqual(original)
  })

  it('does not mutate sessions or caller-owned actions', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    const action = addAction(added)
    const sessionBefore = JSON.stringify(active)
    const actionBefore = JSON.stringify(action)
    undoEngine.recordAction(active, action)

    undoEngine.undo(active)

    expect(JSON.stringify(active)).toBe(sessionBefore)
    expect(JSON.stringify(action)).toBe(actionBefore)
  })
})

describe('UndoEngine validation', () => {
  it('rejects undo with no history', () => {
    expectCode('NO_HISTORY', () => new UndoEngine().undo(session()))
  })

  it('rejects missing sessions', () => {
    const action = addAction(event('one', 'mill', 10))
    expectCode('MISSING_SESSION', () =>
      new UndoEngine().recordAction(null, action),
    )
    expectCode('MISSING_SESSION', () => new UndoEngine().undo(undefined))
  })

  it('rejects malformed and unsupported actions', () => {
    const invalidActions: readonly UndoAction[] = [
      { id: '' } as UndoAction,
      {
        ...addAction(event('one', 'mill', 10)),
        type: 'unsupported',
      } as unknown as UndoAction,
      {
        ...addAction(event('one', 'mill', 10)),
        previousEvent: event('old', 'mill', 1),
      } as unknown as UndoAction,
      updateAction(event('one', 'mill', 10), event('one', 'mill', 10)),
      deleteAction(event('one', 'mill', 10), -1),
      {
        ...addAction(event('one', 'mill', 10)),
        metadata: { nested: {} },
      } as unknown as UndoAction,
    ]

    for (const action of invalidActions) {
      expectCode('INVALID_ACTION', () =>
        new UndoEngine().recordAction(session(), action),
      )
    }
  })

  it('rejects actions for another session or invalid sessions', () => {
    const added = event('one', 'mill', 10)
    const active = session({ scoreEvents: [added] })
    expectCode('INVALID_ACTION', () =>
      new UndoEngine().recordAction(active, {
        ...addAction(added),
        sessionId: 'different-session',
      }),
    )

    const invalidSession = session({
      players: [
        { id: 'same', name: 'One' },
        { id: 'same', name: 'Two' },
      ],
    })
    const error = expectCode('INVALID_SESSION', () =>
      new UndoEngine().recordAction(
        invalidSession,
        addAction(event('one', 'same', 10)),
      ),
    )
    expect(error.cause).toBeDefined()
  })

  it('rejects actions whose current event is missing or changed', () => {
    const added = event('one', 'mill', 10)
    expectCode('MISSING_SCORE_EVENT', () =>
      new UndoEngine().recordAction(session(), addAction(added)),
    )
    expectCode('MISSING_SCORE_EVENT', () =>
      new UndoEngine().recordAction(
        session({ scoreEvents: [event('one', 'mill', 99)] }),
        addAction(added),
      ),
    )
  })

  it('rejects invalid delete restoration metadata', () => {
    const deleted = event('one', 'mill', 10)
    expectCode('INVALID_ACTION', () =>
      new UndoEngine().recordAction(
        session({ scoreEvents: [deleted] }),
        deleteAction(deleted, 0),
      ),
    )
    expectCode('INVALID_ACTION', () =>
      new UndoEngine().recordAction(session(), deleteAction(deleted, 1)),
    )
  })

  it('detects history corruption without consuming history', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, addAction(added))
    const diverged = session({ scoreEvents: [event('one', 'mill', 99)] })

    expectCode('CORRUPTED_HISTORY', () => undoEngine.undo(diverged))
    expect(undoEngine.canUndo()).toBe(true)
  })

  it('rejects history belonging to another session', () => {
    const scoreEngine = new ScoreEngine()
    const undoEngine = new UndoEngine(scoreEngine)
    const added = event('one', 'mill', 10)
    const active = scoreEngine.addScoreEvent(session(), added)
    undoEngine.recordAction(active, addAction(added))

    expectCode('CORRUPTED_HISTORY', () =>
      undoEngine.undo({ ...active, id: 'different-session' }),
    )
  })

  it('rejects invalid restoration and preserves history', () => {
    const undoEngine = new UndoEngine()
    const deleted = event('one', 'missing-player', 10)
    const active = session()
    undoEngine.recordAction(active, deleteAction(deleted, 0))

    const error = expectCode('INVALID_RESTORATION', () =>
      undoEngine.undo(active),
    )
    expect(error.cause).toBeDefined()
    expect(undoEngine.canUndo()).toBe(true)
  })

  it('rejects restoration into a completed session', () => {
    const undoEngine = new UndoEngine()
    const deleted = event('one', 'mill', 10)
    const completed = session({ status: GameSessionStatus.Completed })
    undoEngine.recordAction(completed, deleteAction(deleted, 0))

    expectCode('INVALID_RESTORATION', () => undoEngine.undo(completed))
  })
})
