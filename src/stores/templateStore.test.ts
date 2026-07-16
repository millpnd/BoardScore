import { describe, expect, it } from 'vitest'

import { TemplateEngine } from '@/engine'
import type { GameTemplate } from '@/models'
import { RoundType, ScoringType, WinnerRule } from '@/models'
import type { TemplateStorage } from '@/services'

import { createTemplateStore } from './templateStore'

const customTemplate = (name = 'Custom'): GameTemplate => ({
  id: 'custom',
  name,
  description: 'Custom template',
  icon: 'dice',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.RunningTotal,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
})

class MemoryTemplateStorage implements TemplateStorage {
  templates: GameTemplate[] = []

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

describe('template store', () => {
  it('loads built-in and persisted custom templates', async () => {
    const storage = new MemoryTemplateStorage()
    storage.templates = [customTemplate()]
    const store = createTemplateStore({
      templateEngine: new TemplateEngine(),
      storage,
    })

    expect(await store.getState().loadTemplates()).toBe(true)
    expect(store.getState().builtInTemplates).toHaveLength(3)
    expect(store.getState().customTemplates).toEqual([customTemplate()])
    expect(store.getState().getTemplate('scrabble')?.name).toBe('Scrabble')
  })

  it('coordinates custom template CRUD and active selection', async () => {
    const storage = new MemoryTemplateStorage()
    const store = createTemplateStore({
      templateEngine: new TemplateEngine(),
      storage,
    })
    await store.getState().loadTemplates()

    expect(await store.getState().addTemplate(customTemplate())).toBe(true)
    store.getState().setActiveTemplate('custom')
    expect(store.getState().activeTemplate?.name).toBe('Custom')

    expect(
      await store.getState().updateTemplate(customTemplate('Updated')),
    ).toBe(true)
    expect(store.getState().activeTemplate?.name).toBe('Updated')
    expect(storage.templates[0]?.name).toBe('Updated')

    expect(await store.getState().deleteTemplate('custom')).toBe(true)
    expect(store.getState().customTemplates).toEqual([])
    expect(store.getState().activeTemplate).toBeUndefined()
    expect(storage.templates).toEqual([])
  })

  it('reloads templates and preserves a valid active selection', async () => {
    const storage = new MemoryTemplateStorage()
    const store = createTemplateStore({
      templateEngine: new TemplateEngine(),
      storage,
    })
    await store.getState().loadTemplates()
    store.getState().setActiveTemplate('scrabble')

    expect(await store.getState().reloadTemplates()).toBe(true)
    expect(store.getState().activeTemplate?.id).toBe('scrabble')
    store.getState().setActiveTemplate(undefined)
    expect(store.getState().activeTemplate).toBeUndefined()
  })

  it('reports validation and persistence failures and rolls engine state back', async () => {
    const storage = new MemoryTemplateStorage()
    const engine = new TemplateEngine()
    const store = createTemplateStore({ templateEngine: engine, storage })
    await store.getState().loadTemplates()

    expect(
      await store.getState().addTemplate({ ...customTemplate(), name: '' }),
    ).toBe(false)
    expect(store.getState().error).toContain('name')
    store.getState().clearError()

    storage.saveTemplate = async () => {
      throw new Error('Write failed')
    }
    expect(await store.getState().addTemplate(customTemplate())).toBe(false)
    expect(store.getState().error).toBe('Write failed')
    expect(engine.getTemplate('custom')).toBeUndefined()
  })

  it('does not remove an existing template when a duplicate add is rejected', async () => {
    const storage = new MemoryTemplateStorage()
    storage.templates = [customTemplate()]
    const engine = new TemplateEngine()
    const store = createTemplateStore({ templateEngine: engine, storage })
    await store.getState().loadTemplates()

    expect(
      await store.getState().addTemplate(customTemplate('Duplicate')),
    ).toBe(false)
    expect(engine.getTemplate('custom')?.name).toBe('Custom')
  })
})
