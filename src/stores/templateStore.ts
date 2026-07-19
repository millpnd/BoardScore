import { createStore, type StoreApi } from 'zustand/vanilla'

import type { TemplateEngine } from '@/engine'
import type { EntityId, GameSession, GameTemplate } from '@/models'
import { GameSessionStatus } from '@/models'
import type { TemplateStorage } from '@/services'

import { getErrorMessage } from './storeUtils'

export interface TemplateStoreDependencies {
  readonly templateEngine: TemplateEngine
  readonly storage: TemplateStorage
  readonly getActiveSession?: () =>
    GameSession | null | undefined | Promise<GameSession | null | undefined>
}

export interface TemplateStoreState {
  readonly templates: readonly GameTemplate[]
  readonly builtInTemplates: readonly GameTemplate[]
  readonly customTemplates: readonly GameTemplate[]
  readonly activeTemplate: GameTemplate | undefined
  readonly isLoading: boolean
  readonly error: string | null
  loadTemplates(): Promise<boolean>
  reloadTemplates(): Promise<boolean>
  getTemplate(id: EntityId): GameTemplate | undefined
  setActiveTemplate(id: EntityId | undefined): void
  addTemplate(template: GameTemplate): Promise<boolean>
  updateTemplate(template: GameTemplate): Promise<boolean>
  deleteTemplate(id: EntityId): Promise<boolean>
  clearError(): void
}

export const createTemplateStore = ({
  templateEngine,
  storage,
  getActiveSession,
}: TemplateStoreDependencies): StoreApi<TemplateStoreState> =>
  createStore<TemplateStoreState>((set, get) => {
    const engineState = () => {
      const templates = templateEngine.getTemplates()
      return {
        templates,
        builtInTemplates: templates.filter(({ isBuiltIn }) => isBuiltIn),
        customTemplates: templates.filter(({ isBuiltIn }) => !isBuiltIn),
      }
    }

    const load = async (): Promise<boolean> => {
      set({ isLoading: true, error: null })
      try {
        templateEngine.loadTemplates(await storage.getTemplates())
        const state = engineState()
        const activeId = get().activeTemplate?.id
        set({
          ...state,
          activeTemplate: activeId
            ? templateEngine.getTemplate(activeId)
            : undefined,
          isLoading: false,
        })
        return true
      } catch (error) {
        set({ isLoading: false, error: getErrorMessage(error) })
        return false
      }
    }

    const mutate = async (
      operation: () => void,
      persist: () => Promise<void>,
      rollback: () => void,
    ): Promise<boolean> => {
      set({ isLoading: true, error: null })
      let mutated = false
      try {
        operation()
        mutated = true
        await persist()
        const state = engineState()
        const activeId = get().activeTemplate?.id
        set({
          ...state,
          activeTemplate: activeId
            ? templateEngine.getTemplate(activeId)
            : undefined,
          isLoading: false,
        })
        return true
      } catch (error) {
        if (mutated) {
          try {
            rollback()
          } catch {
            // Original error is more useful; reload can restore provider state.
          }
        }
        set({ isLoading: false, error: getErrorMessage(error) })
        return false
      }
    }

    const canDeleteTemplate = async (id: EntityId): Promise<boolean> => {
      set({ isLoading: true, error: null })
      try {
        const activeSession = await getActiveSession?.()
        if (
          activeSession &&
          activeSession.status !== GameSessionStatus.Completed &&
          activeSession?.template.id === id
        ) {
          throw new Error(
            'Finish or discard the active game before deleting this custom template.',
          )
        }
        return true
      } catch (error) {
        set({ isLoading: false, error: getErrorMessage(error) })
        return false
      }
    }

    return {
      templates: [],
      builtInTemplates: [],
      customTemplates: [],
      activeTemplate: undefined,
      isLoading: false,
      error: null,
      loadTemplates: load,
      reloadTemplates: load,
      getTemplate: (id) => templateEngine.getTemplate(id),
      setActiveTemplate: (id) =>
        set({
          activeTemplate: id ? templateEngine.getTemplate(id) : undefined,
        }),
      addTemplate: (template) =>
        mutate(
          () => {
            templateEngine.registerTemplate(template)
          },
          () => storage.saveTemplate(template),
          () => templateEngine.removeTemplate(template.id),
        ),
      updateTemplate: (template) => {
        const previous = templateEngine.getTemplate(template.id)
        return mutate(
          () => {
            templateEngine.updateTemplate(template)
          },
          () => storage.updateTemplate(template),
          () => {
            if (previous) templateEngine.updateTemplate(previous)
          },
        )
      },
      deleteTemplate: async (id) => {
        if (!(await canDeleteTemplate(id))) return false
        const previous = templateEngine.getTemplate(id)
        return mutate(
          () => {
            templateEngine.removeTemplate(id)
          },
          () => storage.deleteTemplate(id),
          () => {
            if (previous) templateEngine.registerTemplate(previous)
          },
        )
      },
      clearError: () => set({ error: null }),
    }
  })
