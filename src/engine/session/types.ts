import type {
  EntityId,
  GameSession,
  IsoDateTime,
  Player,
  Round,
} from '../../models'
import type { UndoMetadata } from '../undo'
import type { WinnerResult } from '../winner'

export interface CreateSessionInput {
  readonly id: EntityId
  readonly templateId: EntityId
}

export interface ActionContext {
  readonly id: EntityId
  readonly timestamp: IsoDateTime
  readonly metadata?: UndoMetadata
}

export interface NextRoundInput {
  readonly id: EntityId
  readonly startedAt: IsoDateTime
}

export interface PlayerScoreInput {
  readonly id: EntityId
  readonly playerId: EntityId
  readonly points: number
  readonly createdAt: IsoDateTime
}

export interface RestartSessionInput {
  readonly id: EntityId
  readonly players?: readonly Player[]
  readonly startedAt: IsoDateTime
  readonly initialRoundId: EntityId
}

export interface EndGameResult {
  readonly session: GameSession
  readonly winner: WinnerResult
}

export interface SessionSnapshot {
  readonly session: GameSession
  readonly currentRound: Round | undefined
}
