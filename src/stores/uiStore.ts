import { createStore, type StoreApi } from 'zustand/vanilla'

import type { EntityId } from '@/models'

export type NotificationLevel = 'error' | 'info' | 'success' | 'warning'

export interface UiNotification {
  readonly id: EntityId
  readonly message: string
  readonly level: NotificationLevel
}

export interface UiStoreState {
  readonly currentDialog: string | null
  readonly selectedPlayerId: EntityId | null
  readonly selectedRoundId: EntityId | null
  readonly notifications: readonly UiNotification[]
  readonly isLoading: boolean
  readonly error: string | null
  openDialog(dialog: string): void
  closeDialog(): void
  selectPlayer(playerId: EntityId | null): void
  selectRound(roundId: EntityId | null): void
  addNotification(notification: UiNotification): void
  dismissNotification(id: EntityId): void
  clearNotifications(): void
  setLoading(isLoading: boolean): void
  setError(error: string | null): void
  reset(): void
}

const initialUiState = {
  currentDialog: null,
  selectedPlayerId: null,
  selectedRoundId: null,
  notifications: [],
  isLoading: false,
  error: null,
} satisfies Pick<
  UiStoreState,
  | 'currentDialog'
  | 'selectedPlayerId'
  | 'selectedRoundId'
  | 'notifications'
  | 'isLoading'
  | 'error'
>

export const createUiStore = (): StoreApi<UiStoreState> =>
  createStore<UiStoreState>((set) => ({
    ...initialUiState,
    openDialog: (currentDialog) => set({ currentDialog }),
    closeDialog: () => set({ currentDialog: null }),
    selectPlayer: (selectedPlayerId) => set({ selectedPlayerId }),
    selectRound: (selectedRoundId) => set({ selectedRoundId }),
    addNotification: (notification) =>
      set(({ notifications }) => ({
        notifications: [...notifications, { ...notification }],
      })),
    dismissNotification: (id) =>
      set(({ notifications }) => ({
        notifications: notifications.filter(
          (notification) => notification.id !== id,
        ),
      })),
    clearNotifications: () => set({ notifications: [] }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    reset: () => set(initialUiState),
  }))
