import { useContext } from 'react'
import { useStore } from 'zustand'

import type { GameStoreState, TemplateStoreState } from '@/stores'

import { StoreContext } from './storeContext'

export function useGameStore<Selected>(
  selector: (state: GameStoreState) => Selected,
): Selected {
  return useStore(useContext(StoreContext).game, selector)
}

export function useTemplateStore<Selected>(
  selector: (state: TemplateStoreState) => Selected,
): Selected {
  return useStore(useContext(StoreContext).templates, selector)
}
