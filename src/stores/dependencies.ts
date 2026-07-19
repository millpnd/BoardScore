import { SessionEngine, TemplateEngine } from '@/engine'
import { GameSessionStatus } from '@/models'
import { LocalStorageProvider, StorageService } from '@/services'

import { createGameStore } from './gameStore'
import { createSettingsStore } from './settingsStore'
import { createTemplateStore } from './templateStore'
import { createUiStore } from './uiStore'

const storageService = new StorageService(new LocalStorageProvider())
const templateEngine = new TemplateEngine()
templateEngine.loadTemplates()
const sessionEngine = new SessionEngine({ templateEngine })

export const gameStore = createGameStore({
  sessionEngine,
  storage: storageService,
})

export const templateStore = createTemplateStore({
  templateEngine,
  storage: storageService,
  getActiveSession: async () => {
    const currentSession = sessionEngine.getCurrentSession()
    if (
      currentSession &&
      currentSession.status !== GameSessionStatus.Completed
    ) {
      return currentSession
    }
    return (await storageService.loadSession()) ?? currentSession
  },
})

export const settingsStore = createSettingsStore(storageService)
export const uiStore = createUiStore()
