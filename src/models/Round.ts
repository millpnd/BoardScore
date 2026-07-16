import type { EntityId, IsoDateTime } from './types'

/** A score-entry period within a game session. */
export interface Round {
  readonly id: EntityId
  readonly number: number
  readonly startedAt: IsoDateTime
  readonly completedAt?: IsoDateTime
}
