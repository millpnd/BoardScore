import { createContext } from 'react'
import type { StoreApi } from 'zustand/vanilla'

import {
  gameStore,
  templateStore,
  type GameStoreState,
  type TemplateStoreState,
} from '@/stores'

export interface SetupFlowStores {
  readonly game: StoreApi<GameStoreState>
  readonly templates: StoreApi<TemplateStoreState>
}

export const defaultStores: SetupFlowStores = {
  game: gameStore,
  templates: templateStore,
}

export const StoreContext = createContext(defaultStores)
