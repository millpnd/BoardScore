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
