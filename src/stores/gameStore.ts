import { createStore, type StoreApi } from 'zustand/vanilla'

import type {
  ActionContext,
  CreateSessionInput,
  NextRoundInput,
  SessionEngine,
  WinnerResult,
  WinnerStanding,
} from '@/engine'
import type { EntityId, GameSession, Player, Round, ScoreEvent } from '@/models'
import { GameSessionStatus } from '@/models'
import type { SessionStorage } from '@/services'

import { getErrorMessage } from './storeUtils'

export interface GameStoreDependencies {
  readonly sessionEngine: SessionEngine
  readonly storage: SessionStorage
}

export interface GameStoreState {
  readonly session: GameSession | undefined
  readonly recoverableSession: GameSession | undefined
  readonly currentRound: Round | undefined
  readonly players: readonly Player[]
  readonly currentStandings: readonly WinnerStanding[]
  readonly currentWinner: WinnerStanding | undefined
  readonly winnerResult: WinnerResult | undefined
  readonly playerTotals: readonly PlayerTotal[]
  readonly currentRoundScores: readonly PlayerTotal[]
  readonly isGameActive: boolean
  readonly canUndo: boolean
  readonly hasActiveSession: boolean
  readonly isLoading: boolean
  readonly error: string | null
  createSession(input: CreateSessionInput): Promise<boolean>
  setupGame(input: SetupGameInput): Promise<boolean>
  checkForRecoverableSession(): Promise<boolean>
  resumeSession(): Promise<boolean>
  discardSession(): Promise<boolean>
  addPlayer(player: Player): Promise<boolean>
  removePlayer(playerId: EntityId): Promise<boolean>
  renamePlayer(playerId: EntityId, name: string): Promise<boolean>
  startGame(startedAt: string): Promise<boolean>
  endGame(completedAt: string): Promise<boolean>
  resetScores(newSessionId: EntityId): Promise<boolean>
  restartGame(input: RestartGameInput): Promise<boolean>
  nextRound(input: NextRoundInput): Promise<boolean>
  addScore(event: ScoreEvent, context: ActionContext): Promise<boolean>
  recordScore(input: RecordScoreInput): Promise<boolean>
  updateScore(event: ScoreEvent, context: ActionContext): Promise<boolean>
  removeScore(eventId: EntityId, context: ActionContext): Promise<boolean>
  undoLastAction(): Promise<boolean>
  clearError(): void
}

export interface PlayerTotal {
  readonly playerId: EntityId
  readonly playerName: string
  readonly total: number
}

export interface SetupGameInput {
  readonly sessionId: EntityId
  readonly templateId: EntityId
  readonly players: readonly Player[]
  readonly startedAt: string
  readonly initialRoundId: EntityId
}

export interface RecordScoreInput {
  readonly eventId: EntityId
  readonly actionId: EntityId
  readonly playerId: EntityId
  readonly points: number
  readonly timestamp: string
}

export interface RestartGameInput {
  readonly sessionId: EntityId
  readonly players?: readonly Player[]
  readonly startedAt: string
  readonly initialRoundId: EntityId
}

type GameProjection = Pick<
  GameStoreState,
  | 'session'
  | 'recoverableSession'
  | 'currentRound'
  | 'players'
  | 'currentStandings'
  | 'currentWinner'
  | 'winnerResult'
  | 'playerTotals'
  | 'currentRoundScores'
  | 'isGameActive'
  | 'canUndo'
  | 'hasActiveSession'
>

const emptyState: GameProjection = {
  session: undefined,
  recoverableSession: undefined,
  currentRound: undefined,
  players: [],
  currentStandings: [],
  currentWinner: undefined,
  winnerResult: undefined,
  playerTotals: [],
  currentRoundScores: [],
  isGameActive: false,
  canUndo: false,
  hasActiveSession: false,
}

export const createGameStore = ({
  sessionEngine,
  storage,
}: GameStoreDependencies): StoreApi<GameStoreState> =>
  createStore<GameStoreState>((set, get) => {
    const engineState = (): GameProjection => {
      const session = sessionEngine.getCurrentSession()
      if (!session) return emptyState

      const winnerResult = sessionEngine.getWinnerResult()
      const currentStandings = winnerResult.standings
      return {
        session,
        recoverableSession: undefined,
        currentRound: sessionEngine.getCurrentRound(),
        players: session.players,
        currentStandings,
        currentWinner: sessionEngine.getWinner(),
        winnerResult,
        playerTotals: currentStandings.map(
          ({ playerId, playerName, total }) => ({
            playerId,
            playerName,
            total,
          }),
        ),
        currentRoundScores: sessionEngine.getCurrentRoundScores(),
        isGameActive: session.status === GameSessionStatus.Active,
        canUndo: sessionEngine.canUndo(),
        hasActiveSession: session.status !== GameSessionStatus.Completed,
      }
    }

    const persistCurrent = async (): Promise<void> => {
      const session = sessionEngine.getCurrentSession()
      if (session?.status === GameSessionStatus.Completed) {
        await storage.deleteSession()
      } else if (session) {
        await storage.saveSession(session)
      }
    }

    const execute = async (
      operation: () => void,
      persist = true,
    ): Promise<boolean> => {
      set({ isLoading: true, error: null })
      try {
        operation()
        if (persist) await persistCurrent()
        set({ ...engineState(), isLoading: false })
        return true
      } catch (error) {
        set({
          ...engineState(),
          isLoading: false,
          error: getErrorMessage(error),
        })
        return false
      }
    }

    const executeLifecycleTransition = async (
      operation: () => void,
    ): Promise<boolean> => {
      set({ isLoading: true, error: null })
      try {
        operation()
      } catch (error) {
        set({
          ...engineState(),
          isLoading: false,
          error: getErrorMessage(error),
        })
        return false
      }

      try {
        await persistCurrent()
        set({ ...engineState(), isLoading: false })
      } catch (error) {
        set({
          ...engineState(),
          isLoading: false,
          error: getErrorMessage(error),
        })
      }
      return true
    }

    return {
      ...emptyState,
      isLoading: false,
      error: null,
      createSession: (input) =>
        execute(() => {
          sessionEngine.createSession(input)
        }),
      setupGame: async ({
        sessionId,
        templateId,
        players,
        startedAt,
        initialRoundId,
      }) => {
        set({ isLoading: true, error: null })
        try {
          sessionEngine.createSession({ id: sessionId, templateId })
          for (const player of players) sessionEngine.addPlayer(player)
          sessionEngine.startGame(startedAt)
          sessionEngine.nextRound({ id: initialRoundId, startedAt })
          await persistCurrent()
          set({ ...engineState(), isLoading: false })
          return true
        } catch (error) {
          sessionEngine.discardSession()
          set({
            ...emptyState,
            isLoading: false,
            error: getErrorMessage(error),
          })
          return false
        }
      },
      checkForRecoverableSession: async () => {
        set({ isLoading: true, error: null })
        try {
          const currentSession = sessionEngine.getCurrentSession()
          if (
            currentSession &&
            currentSession.status !== GameSessionStatus.Completed
          ) {
            set({ recoverableSession: currentSession, isLoading: false })
            return true
          }

          const recoverableSession = (await storage.loadSession()) ?? undefined
          set({ recoverableSession, isLoading: false })
          return recoverableSession !== undefined
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) })
          return false
        }
      },
      resumeSession: async () => {
        set({ isLoading: true, error: null })
        try {
          const currentSession = sessionEngine.getCurrentSession()
          if (
            currentSession &&
            currentSession.status !== GameSessionStatus.Completed
          ) {
            set({
              ...engineState(),
              recoverableSession: undefined,
              isLoading: false,
            })
            return true
          }

          const session =
            get().recoverableSession ?? (await storage.loadSession())
          if (!session) {
            set({ ...emptyState, isLoading: false })
            return false
          }
          sessionEngine.resumeSession(session)
          set({ ...engineState(), isLoading: false })
          return true
        } catch (error) {
          set({
            ...engineState(),
            isLoading: false,
            error: getErrorMessage(error),
          })
          return false
        }
      },
      discardSession: async () => {
        set({ isLoading: true, error: null })
        try {
          await storage.deleteSession()
          sessionEngine.discardSession()
          set({ ...emptyState, isLoading: false })
          return true
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) })
          return false
        }
      },
      addPlayer: (player) =>
        execute(() => {
          sessionEngine.addPlayer(player)
        }),
      removePlayer: (playerId) =>
        execute(() => {
          sessionEngine.removePlayer(playerId)
        }),
      renamePlayer: (playerId, name) =>
        execute(() => {
          sessionEngine.renamePlayer(playerId, name)
        }),
      startGame: (startedAt) =>
        execute(() => {
          sessionEngine.startGame(startedAt)
        }),
      endGame: (completedAt) =>
        executeLifecycleTransition(() => {
          sessionEngine.endGame(completedAt)
        }),
      resetScores: (newSessionId) =>
        execute(() => {
          sessionEngine.resetScores(newSessionId)
        }),
      restartGame: ({ sessionId, players, startedAt, initialRoundId }) =>
        executeLifecycleTransition(() => {
          sessionEngine.restartGame({
            id: sessionId,
            players,
            startedAt,
            initialRoundId,
          })
        }),
      nextRound: (input) =>
        execute(() => {
          sessionEngine.nextRound(input)
        }),
      addScore: (event, context) =>
        execute(() => {
          sessionEngine.addScore(event, context)
        }),
      recordScore: ({ eventId, actionId, playerId, points, timestamp }) =>
        execute(() => {
          sessionEngine.addPlayerScore(
            { id: eventId, playerId, points, createdAt: timestamp },
            { id: actionId, timestamp },
          )
        }),
      updateScore: (event, context) =>
        execute(() => {
          sessionEngine.updateScore(event, context)
        }),
      removeScore: (eventId, context) =>
        execute(() => {
          sessionEngine.deleteScore(eventId, context)
        }),
      undoLastAction: () =>
        execute(() => {
          sessionEngine.undoLastAction()
        }),
      clearError: () => set({ error: null }),
    }
  })
