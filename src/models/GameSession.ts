import type { GameTemplate } from './GameTemplate'
import type { Player } from './Player'
import type { Round } from './Round'
import type { ScoreEvent } from './ScoreEvent'
import type { EntityId, IsoDateTime } from './types'
import { GameSessionStatus } from './types'

/** Recoverable state for one in-progress or newly completed game. */
export interface GameSession {
  readonly id: EntityId
  /** Snapshot prevents later template edits from changing an active game. */
  readonly template: GameTemplate
  readonly players: readonly Player[]
  readonly rounds: readonly Round[]
  readonly scoreEvents: readonly ScoreEvent[]
  readonly status: GameSessionStatus
  readonly startedAt: IsoDateTime
  readonly completedAt?: IsoDateTime
}
