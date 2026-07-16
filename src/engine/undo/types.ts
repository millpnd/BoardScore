import type {
  EntityId,
  GameSession,
  IsoDateTime,
  ScoreEvent,
} from '../../models'
import type { ScoreCalculation } from '../score'

export enum UndoActionType {
  AddScoreEvent = 'add-score-event',
  UpdateScoreEvent = 'update-score-event',
  DeleteScoreEvent = 'delete-score-event',
}

export type UndoMetadata = Readonly<
  Record<string, boolean | number | string | null>
>

interface UndoActionBase {
  readonly id: EntityId
  readonly sessionId: EntityId
  readonly timestamp: IsoDateTime
  readonly metadata?: UndoMetadata
}

export interface AddScoreEventAction extends UndoActionBase {
  readonly type: UndoActionType.AddScoreEvent
  readonly previousEvent: null
  readonly currentEvent: ScoreEvent
}

export interface UpdateScoreEventAction extends UndoActionBase {
  readonly type: UndoActionType.UpdateScoreEvent
  readonly previousEvent: ScoreEvent
  readonly currentEvent: ScoreEvent
}

export interface DeleteScoreEventAction extends UndoActionBase {
  readonly type: UndoActionType.DeleteScoreEvent
  readonly previousEvent: ScoreEvent
  readonly currentEvent: null
  /** Original zero-based position, required to restore exact history order. */
  readonly eventIndex: number
}

export type UndoAction =
  AddScoreEventAction | UpdateScoreEventAction | DeleteScoreEventAction

export interface UndoResult {
  readonly session: GameSession
  readonly calculation: ScoreCalculation
  readonly action: UndoAction
}
