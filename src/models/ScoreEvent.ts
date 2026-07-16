import type { EntityId, IsoDateTime } from './types'
import { ScoreEventType } from './types'

/** Immutable scoring fact. Player totals are derived from ordered events. */
export interface ScoreEvent {
  readonly id: EntityId
  readonly playerId: EntityId
  readonly roundId?: EntityId
  readonly type: ScoreEventType
  readonly points: number
  readonly createdAt: IsoDateTime
}
