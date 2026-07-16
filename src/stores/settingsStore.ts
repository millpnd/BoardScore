import { createStore, type StoreApi } from 'zustand/vanilla'

import type {
  ApplicationSettings,
  SettingsStorage,
  SettingValue,
} from '@/services'

import { getErrorMessage } from './storeUtils'

export const DEFAULT_SETTINGS: ApplicationSettings = {
  theme: 'system',
  preferences: {},
}

export interface SettingsStoreState {
  readonly settings: ApplicationSettings
  readonly theme: string
  readonly preferences: Readonly<Record<string, SettingValue>>
  readonly isLoading: boolean
  readonly error: string | null
  loadSettings(): Promise<boolean>
  saveSettings(settings: ApplicationSettings): Promise<boolean>
  resetSettings(): Promise<boolean>
  clearError(): void
}

const projectSettings = (settings: ApplicationSettings) => ({
  settings,
  theme: settings.theme ?? DEFAULT_SETTINGS.theme!,
  preferences: settings.preferences ?? {},
})

export const createSettingsStore = (
  storage: SettingsStorage,
): StoreApi<SettingsStoreState> =>
  createStore<SettingsStoreState>((set) => {
    const execute = async (
      operation: () => Promise<ApplicationSettings>,
    ): Promise<boolean> => {
      set({ isLoading: true, error: null })
      try {
        const settings = await operation()
        set({ ...projectSettings(settings), isLoading: false })
        return true
      } catch (error) {
        set({ isLoading: false, error: getErrorMessage(error) })
        return false
      }
    }

    return {
      ...projectSettings(DEFAULT_SETTINGS),
      isLoading: false,
      error: null,
      loadSettings: () =>
        execute(async () => (await storage.loadSettings()) ?? DEFAULT_SETTINGS),
      saveSettings: (settings) =>
        execute(async () => {
          await storage.saveSettings(settings)
          return settings
        }),
      resetSettings: () =>
        execute(async () => {
          await storage.deleteSettings()
          return DEFAULT_SETTINGS
        }),
      clearError: () => set({ error: null }),
    }
  })
