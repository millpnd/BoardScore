import { describe, expect, it } from 'vitest'

import type { GameSession, GameTemplate } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import type { StorageProvider } from './contracts'
import { StorageError } from './StorageError'
import { StorageService } from './StorageService'
import { STORAGE_KEYS } from './storageKeys'

class MemoryProvider implements StorageProvider {
  readonly values = new Map<string, string>()

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key)
  }
}

const template = (overrides: Partial<GameTemplate> = {}): GameTemplate => ({
  id: 'custom-game',
  name: 'Custom Game',
  description: 'Storage test template.',
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

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  template: template(),
  players: [
    { id: 'mill', name: 'Mill' },
    { id: 'john', name: 'John' },
  ],
  rounds: [
    {
      id: 'round-1',
      number: 1,
      startedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  scoreEvents: [
    {
      id: 'event-1',
      playerId: 'mill',
      roundId: 'round-1',
      type: ScoreEventType.Score,
      points: 10,
      createdAt: '2026-01-01T00:01:00.000Z',
    },
  ],
  status: GameSessionStatus.Active,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const expectStorageCode = async (
  code: StorageError['code'],
  operation: Promise<unknown>,
) => {
  await expect(operation).rejects.toEqual(
    expect.objectContaining<Partial<StorageError>>({ code }),
  )
}

describe('StorageService active sessions', () => {
  it('saves, detects, loads, and deletes an active session', async () => {
    const provider = new MemoryProvider()
    const service = new StorageService(provider)

    expect(await service.hasSession()).toBe(false)
    expect(await service.loadSession()).toBeNull()
    await service.saveSession(session())
    expect(await service.hasSession()).toBe(true)
    expect(await service.loadSession()).toEqual(session())
    await service.deleteSession()
    expect(await service.hasSession()).toBe(false)
  })

  it('supports not-started sessions but rejects completed sessions', async () => {
    const service = new StorageService(new MemoryProvider())
    const notStarted = session({
      status: GameSessionStatus.NotStarted,
      startedAt: undefined,
      scoreEvents: [],
      rounds: [],
    })

    await service.saveSession(notStarted)
    expect(await service.loadSession()).toEqual(notStarted)
    await expectStorageCode(
      'INVALID_DATA',
      service.saveSession(
        session({ status: GameSessionStatus.Completed, completedAt: 'end' }),
      ),
    )
  })

  it('rejects invalid sessions at the write boundary', async () => {
    const invalid = {
      ...session(),
      players: 'invalid',
    } as unknown as GameSession

    await expectStorageCode(
      'INVALID_DATA',
      new StorageService(new MemoryProvider()).saveSession(invalid),
    )
  })

  it('rejects completed sessions found in active storage', async () => {
    const provider = new MemoryProvider()
    const service = new StorageService(provider)
    provider.values.set(
      STORAGE_KEYS.activeSession,
      JSON.stringify({
        version: 1,
        data: session({
          status: GameSessionStatus.Completed,
          completedAt: 'end',
        }),
      }),
    )

    await expectStorageCode('CORRUPTED_DATA', service.loadSession())
  })

  it('reports malformed JSON, schema corruption, and version mismatch', async () => {
    const provider = new MemoryProvider()
    const service = new StorageService(provider)

    provider.values.set(STORAGE_KEYS.activeSession, '{bad')
    await expectStorageCode('INVALID_JSON', service.loadSession())

    provider.values.set(
      STORAGE_KEYS.activeSession,
      JSON.stringify({ version: 1, data: { id: 'broken' } }),
    )
    await expectStorageCode('CORRUPTED_DATA', service.loadSession())

    provider.values.set(
      STORAGE_KEYS.activeSession,
      JSON.stringify({ version: 99, data: session() }),
    )
    await expectStorageCode('VERSION_MISMATCH', service.loadSession())
  })
})

describe('StorageService custom templates', () => {
  it('saves, retrieves, updates, and deletes custom templates', async () => {
    const service = new StorageService(new MemoryProvider())
    expect(await service.getTemplates()).toEqual([])

    await service.saveTemplate(template())
    expect(await service.getTemplates()).toEqual([template()])

    const updated = template({ name: 'Updated', version: 2 })
    await service.updateTemplate(updated)
    expect(await service.getTemplates()).toEqual([updated])

    await service.deleteTemplate(updated.id)
    expect(await service.getTemplates()).toEqual([])
  })

  it('rejects duplicate, missing, built-in, and malformed templates', async () => {
    const service = new StorageService(new MemoryProvider())
    await service.saveTemplate(template())

    await expectStorageCode('CONFLICT', service.saveTemplate(template()))
    await expectStorageCode(
      'NOT_FOUND',
      service.updateTemplate(template({ id: 'missing' })),
    )
    await expectStorageCode('NOT_FOUND', service.deleteTemplate('missing'))
    await expectStorageCode(
      'INVALID_DATA',
      service.saveTemplate(template({ isBuiltIn: true })),
    )
    await expectStorageCode(
      'INVALID_DATA',
      service.saveTemplate({
        ...template(),
        name: 3,
      } as unknown as GameTemplate),
    )
  })

  it('rejects corrupted template collections', async () => {
    const provider = new MemoryProvider()
    provider.values.set(
      STORAGE_KEYS.customTemplates,
      JSON.stringify({ version: 1, data: [template(), { broken: true }] }),
    )

    await expectStorageCode(
      'CORRUPTED_DATA',
      new StorageService(provider).getTemplates(),
    )

    provider.values.set(
      STORAGE_KEYS.customTemplates,
      JSON.stringify({
        version: 1,
        data: [template({ isBuiltIn: true })],
      }),
    )
    await expectStorageCode(
      'CORRUPTED_DATA',
      new StorageService(provider).getTemplates(),
    )
  })
})

describe('StorageService settings and clearing', () => {
  it('saves, loads, and deletes extensible settings', async () => {
    const service = new StorageService(new MemoryProvider())
    const settings = {
      theme: 'dark',
      lastSelectedGameId: 'scrabble',
      preferences: { sound: true, scoreStep: 5, note: null },
    } as const

    expect(await service.loadSettings()).toBeNull()
    await service.saveSettings(settings)
    expect(await service.loadSettings()).toEqual(settings)
    await service.deleteSettings()
    expect(await service.loadSettings()).toBeNull()
  })

  it('rejects invalid settings on write and read', async () => {
    const provider = new MemoryProvider()
    const service = new StorageService(provider)
    await expectStorageCode(
      'INVALID_DATA',
      service.saveSettings({ preferences: { invalid: Number.NaN } }),
    )

    provider.values.set(
      STORAGE_KEYS.settings,
      JSON.stringify({ version: 1, data: { preferences: [] } }),
    )
    await expectStorageCode('CORRUPTED_DATA', service.loadSettings())
  })

  it('clears every BoardScore storage key', async () => {
    const provider = new MemoryProvider()
    const service = new StorageService(provider)
    await service.saveSession(session())
    await service.saveTemplate(template())
    await service.saveSettings({ theme: 'system' })

    await service.clearAll()

    expect(provider.values).toEqual(new Map())
  })

  it('works with any asynchronous StorageProvider implementation', async () => {
    const provider: StorageProvider = new MemoryProvider()
    const service = new StorageService(provider)

    await service.saveSettings({ theme: 'provider-neutral' })

    expect(await service.loadSettings()).toEqual({
      theme: 'provider-neutral',
    })
  })
})
