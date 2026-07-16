import { SessionEngine, TemplateEngine } from '@/engine'
import type { GameSession, GameTemplate } from '@/models'
import type { SessionStorage, TemplateStorage } from '@/services'
import { createGameStore, createTemplateStore } from '@/stores'

import type { SetupFlowStores } from '@/app/storeContext'

export class SetupFlowMemoryStorage implements SessionStorage, TemplateStorage {
  session: GameSession | null = null
  templates: GameTemplate[] = []

  async saveSession(session: GameSession): Promise<void> {
    this.session = session
  }

  async loadSession(): Promise<GameSession | null> {
    return this.session
  }

  async hasSession(): Promise<boolean> {
    return this.session !== null
  }

  async deleteSession(): Promise<void> {
    this.session = null
  }

  async saveTemplate(template: GameTemplate): Promise<void> {
    this.templates.push(template)
  }

  async updateTemplate(template: GameTemplate): Promise<void> {
    this.templates = this.templates.map((current) =>
      current.id === template.id ? template : current,
    )
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates = this.templates.filter((template) => template.id !== id)
  }

  async getTemplates(): Promise<readonly GameTemplate[]> {
    return this.templates
  }
}

export const createSetupFlowStores = (
  storage = new SetupFlowMemoryStorage(),
): SetupFlowStores => {
  const templateEngine = new TemplateEngine()
  templateEngine.loadTemplates()
  return {
    game: createGameStore({
      sessionEngine: new SessionEngine({ templateEngine }),
      storage,
    }),
    templates: createTemplateStore({ templateEngine, storage }),
  }
}
