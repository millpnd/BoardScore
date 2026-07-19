import { describe, expect, it } from 'vitest'

import { SessionEngine } from '@/engine'
import type { GameSession, ScoreEvent } from '@/models'
import { GameSessionStatus, ScoreEventType } from '@/models'
import type { SessionStorage } from '@/services'

import { createGameStore } from './gameStore'

class MemorySessionStorage implements SessionStorage {
  session: GameSession | null = null
  saves = 0
  deletes = 0

  async saveSession(session: GameSession): Promise<void> {
    this.session = session
    this.saves += 1
  }

  async loadSession(): Promise<GameSession | null> {
    return this.session
  }

  async hasSession(): Promise<boolean> {
    return this.session !== null
  }

  async deleteSession(): Promise<void> {
    this.session = null
    this.deletes += 1
  }
}

const score = (points = 12): ScoreEvent => ({
  id: 'score-1',
  playerId: 'mill',
  type: ScoreEventType.Score,
  points,
  createdAt: '2026-01-01T00:10:00.000Z',
})

const action = (id: string) => ({
  id,
  timestamp: '2026-01-01T00:11:00.000Z',
})

const setupActiveStore = async () => {
  const storage = new MemorySessionStorage()
  const store = createGameStore({
    sessionEngine: new SessionEngine(),
    storage,
  })
  await store.getState().createSession({
    id: 'session-1',
    templateId: 'scrabble',
  })
  await store.getState().addPlayer({ id: 'mill', name: 'Mill' })
  await store.getState().addPlayer({ id: 'john', name: 'John' })
  await store.getState().renamePlayer('john', 'Johnny')
  await store.getState().startGame('2026-01-01T00:00:00.000Z')
  return { store, storage }
}

describe('game store', () => {
  it('sets up and persists a complete active game atomically', async () => {
    const storage = new MemorySessionStorage()
    const store = createGameStore({
      sessionEngine: new SessionEngine(),
      storage,
    })

    expect(
      await store.getState().setupGame({
        sessionId: 'session-1',
        templateId: 'scrabble',
        players: [
          { id: 'mill', name: 'Mill' },
          { id: 'john', name: 'John' },
        ],
        startedAt: '2026-01-01T00:00:00.000Z',
        initialRoundId: 'round-1',
      }),
    ).toBe(true)
    expect(store.getState()).toMatchObject({
      isGameActive: true,
      players: [{ name: 'Mill' }, { name: 'John' }],
    })
    expect(storage.saves).toBe(1)
    expect(storage.session?.rounds).toMatchObject([
      { id: 'round-1', number: 1 },
    ])
  })

  it('rolls back invalid setup instead of retaining a partial session', async () => {
    const store = createGameStore({
      sessionEngine: new SessionEngine(),
      storage: new MemorySessionStorage(),
    })

    expect(
      await store.getState().setupGame({
        sessionId: 'session-1',
        templateId: 'scrabble',
        players: [{ id: 'mill', name: 'Mill' }],
        startedAt: 'now',
        initialRoundId: 'round-1',
      }),
    ).toBe(false)
    expect(store.getState().session).toBeUndefined()
    expect(store.getState().error).toContain('At least 2 players')
  })

  it('creates sessions, manages setup players, and persists each change', async () => {
    const storage = new MemorySessionStorage()
    const store = createGameStore({
      sessionEngine: new SessionEngine(),
      storage,
    })

    expect(
      await store.getState().createSession({
        id: 'session-1',
        templateId: 'scrabble',
      }),
    ).toBe(true)
    await store.getState().addPlayer({ id: 'mill', name: 'Mill' })
    await store.getState().addPlayer({ id: 'john', name: 'John' })
    await store.getState().removePlayer('john')

    expect(store.getState()).toMatchObject({
      hasActiveSession: true,
      isGameActive: false,
      players: [{ id: 'mill', name: 'Mill' }],
      error: null,
    })
    expect(storage.session?.players).toEqual([{ id: 'mill', name: 'Mill' }])
    expect(storage.saves).toBe(4)
  })

  it('delegates scoring, standings, winner, and undo to engines', async () => {
    const { store, storage } = await setupActiveStore()

    await store.getState().addScore(score(), action('add-score'))

    expect(store.getState()).toMatchObject({
      isGameActive: true,
      canUndo: true,
      currentWinner: { playerId: 'mill', total: 12, isWinner: true },
      playerTotals: [
        { playerId: 'mill', total: 12 },
        { playerId: 'john', total: 0 },
      ],
    })

    await store.getState().updateScore(score(20), action('update-score'))
    expect(store.getState().playerTotals[0]?.total).toBe(20)
    await store.getState().removeScore('score-1', action('delete-score'))
    expect(store.getState().session?.scoreEvents).toEqual([])
    await store.getState().undoLastAction()
    expect(store.getState().session?.scoreEvents[0]?.points).toBe(20)
    expect(storage.session?.scoreEvents[0]?.points).toBe(20)
  })

  it('records player scores through SessionEngine and persists projections', async () => {
    const { store, storage } = await setupActiveStore()

    expect(
      await store.getState().recordScore({
        eventId: 'score-1',
        actionId: 'add-score-1',
        playerId: 'mill',
        points: 14,
        timestamp: '2026-01-01T00:10:00.000Z',
      }),
    ).toBe(true)

    expect(store.getState().playerTotals[0]).toMatchObject({
      playerId: 'mill',
      total: 14,
    })
    expect(storage.session?.scoreEvents[0]?.points).toBe(14)
  })

  it('advances rounds and exposes the current round', async () => {
    const { store } = await setupActiveStore()

    await store.getState().nextRound({
      id: 'round-1',
      startedAt: '2026-01-01T00:20:00.000Z',
    })

    expect(store.getState().currentRound).toMatchObject({
      id: 'round-1',
      number: 1,
    })
  })

  it('recovers and discards a persisted session', async () => {
    const source = await setupActiveStore()
    const storage = source.storage
    const recovered = createGameStore({
      sessionEngine: new SessionEngine(),
      storage,
    })

    expect(await recovered.getState().checkForRecoverableSession()).toBe(true)
    expect(recovered.getState().session).toBeUndefined()
    expect(recovered.getState().recoverableSession?.id).toBe('session-1')

    expect(await recovered.getState().resumeSession()).toBe(true)
    expect(recovered.getState()).toMatchObject({
      isGameActive: true,
      hasActiveSession: true,
      players: [{ id: 'mill' }, { id: 'john' }],
    })

    expect(await recovered.getState().discardSession()).toBe(true)
    expect(recovered.getState().session).toBeUndefined()
    expect(storage.session).toBeNull()
  })

  it('returns false when no session exists to recover', async () => {
    const store = createGameStore({
      sessionEngine: new SessionEngine(),
      storage: new MemorySessionStorage(),
    })

    expect(await store.getState().resumeSession()).toBe(false)
    expect(store.getState().error).toBeNull()
  })

  it('deletes completed sessions and can reset for another game', async () => {
    const { store, storage } = await setupActiveStore()

    await store.getState().endGame('2026-01-01T01:00:00.000Z')
    expect(store.getState().session?.status).toBe(GameSessionStatus.Completed)
    expect(store.getState().hasActiveSession).toBe(false)
    expect(storage.session).toBeNull()

    await store.getState().resetScores('session-2')
    expect(store.getState().session).toMatchObject({
      id: 'session-2',
      status: GameSessionStatus.NotStarted,
      scoreEvents: [],
    })
    expect(storage.session?.id).toBe('session-2')
  })

  it('exposes tied final results and restarts with retained players', async () => {
    const { store, storage } = await setupActiveStore()
    await store.getState().addScore(score(12), action('add-mill'))
    await store
      .getState()
      .addScore(
        { ...score(12), id: 'score-2', playerId: 'john' },
        action('add-john'),
      )

    await store.getState().endGame('2026-01-01T01:00:00.000Z')

    expect(store.getState().winnerResult).toMatchObject({
      isTie: true,
      winners: [
        { playerId: 'mill', rank: 1, total: 12 },
        { playerId: 'john', rank: 1, total: 12 },
      ],
    })
    expect(storage.session).toBeNull()

    expect(
      await store.getState().restartGame({
        sessionId: 'session-2',
        startedAt: '2026-01-02T00:00:00.000Z',
        initialRoundId: 'round-1',
      }),
    ).toBe(true)
    expect(store.getState()).toMatchObject({
      canUndo: false,
      isGameActive: true,
      players: [{ name: 'Mill' }, { name: 'Johnny' }],
      session: {
        id: 'session-2',
        scoreEvents: [],
        rounds: [{ id: 'round-1', number: 1 }],
      },
    })
    expect(storage.session?.id).toBe('session-2')
  })

  it('restarts with edited players and does not retain completed scores', async () => {
    const { store } = await setupActiveStore()
    await store.getState().addScore(score(), action('add-score'))
    await store.getState().endGame('2026-01-01T01:00:00.000Z')

    expect(
      await store.getState().restartGame({
        sessionId: 'session-2',
        players: [
          { id: 'john', name: 'Johnny' },
          { id: 'jane', name: 'Jane' },
        ],
        startedAt: '2026-01-02T00:00:00.000Z',
        initialRoundId: 'round-1',
      }),
    ).toBe(true)
    expect(store.getState().session).toMatchObject({
      players: [{ name: 'Johnny' }, { name: 'Jane' }],
      scoreEvents: [],
    })
  })

  it('keeps lifecycle transitions usable when persistence fails', async () => {
    const completed = await setupActiveStore()
    completed.storage.deleteSession = async () => {
      throw new Error('Cleanup unavailable')
    }

    expect(
      await completed.store.getState().endGame('2026-01-01T01:00:00.000Z'),
    ).toBe(true)
    expect(completed.store.getState()).toMatchObject({
      error: 'Cleanup unavailable',
      session: { status: GameSessionStatus.Completed },
    })

    const replay = await setupActiveStore()
    await replay.store.getState().endGame('2026-01-01T01:00:00.000Z')
    replay.storage.saveSession = async () => {
      throw new Error('Storage unavailable')
    }

    expect(
      await replay.store.getState().restartGame({
        sessionId: 'session-2',
        startedAt: '2026-01-02T00:00:00.000Z',
        initialRoundId: 'round-1',
      }),
    ).toBe(true)
    expect(replay.store.getState()).toMatchObject({
      error: 'Storage unavailable',
      session: { status: GameSessionStatus.Active },
    })
  })

  it('captures engine and storage errors without throwing to callers', async () => {
    const storage = new MemorySessionStorage()
    const store = createGameStore({
      sessionEngine: new SessionEngine(),
      storage,
    })

    expect(await store.getState().startGame('now')).toBe(false)
    expect(store.getState().error).toContain('No current game session')
    store.getState().clearError()
    expect(store.getState().error).toBeNull()

    storage.saveSession = async () => {
      throw new Error('Storage unavailable')
    }
    await store.getState().createSession({
      id: 'session-1',
      templateId: 'scrabble',
    })
    expect(store.getState().error).toBe('Storage unavailable')
  })
})
