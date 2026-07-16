import { describe, expect, it } from 'vitest'

import type { ApplicationSettings, SettingsStorage } from '@/services'

import { createSettingsStore, DEFAULT_SETTINGS } from './settingsStore'

class MemorySettingsStorage implements SettingsStorage {
  settings: ApplicationSettings | null = null

  async saveSettings(settings: ApplicationSettings): Promise<void> {
    this.settings = settings
  }

  async loadSettings(): Promise<ApplicationSettings | null> {
    return this.settings
  }

  async deleteSettings(): Promise<void> {
    this.settings = null
  }
}

describe('settings store', () => {
  it('loads defaults when settings are missing', async () => {
    const store = createSettingsStore(new MemorySettingsStorage())

    expect(await store.getState().loadSettings()).toBe(true)
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(store.getState().theme).toBe('system')
  })

  it('saves, projects, and reloads settings', async () => {
    const storage = new MemorySettingsStorage()
    const store = createSettingsStore(storage)
    const settings = {
      theme: 'dark',
      preferences: { sounds: true, volume: 4 },
    } satisfies ApplicationSettings

    expect(await store.getState().saveSettings(settings)).toBe(true)
    expect(store.getState()).toMatchObject({
      theme: 'dark',
      preferences: { sounds: true, volume: 4 },
    })

    const restored = createSettingsStore(storage)
    await restored.getState().loadSettings()
    expect(restored.getState().settings).toEqual(settings)
  })

  it('resets persisted settings to defaults', async () => {
    const storage = new MemorySettingsStorage()
    storage.settings = { theme: 'dark' }
    const store = createSettingsStore(storage)

    expect(await store.getState().resetSettings()).toBe(true)
    expect(storage.settings).toBeNull()
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('exposes storage errors and clears them', async () => {
    const storage = new MemorySettingsStorage()
    storage.loadSettings = async () => {
      throw new Error('Read failed')
    }
    const store = createSettingsStore(storage)

    expect(await store.getState().loadSettings()).toBe(false)
    expect(store.getState().error).toBe('Read failed')
    store.getState().clearError()
    expect(store.getState().error).toBeNull()
  })
})
