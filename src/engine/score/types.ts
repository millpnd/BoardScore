import type { EntityId, ScoreEvent } from '../../models'

export interface PlayerTotal {
  readonly playerId: EntityId
  readonly playerName: string
  readonly total: number
}

export interface PlayerStanding extends PlayerTotal {
  /** Competition rank: tied players share rank and the next rank is skipped. */
  readonly rank: number
}

export interface RoundSummary {
  readonly roundId: EntityId
  readonly roundNumber: number
  readonly scores: readonly PlayerTotal[]
  readonly total: number
}

export interface ScoreCalculation {
  readonly playerTotals: readonly PlayerTotal[]
  readonly standings: readonly PlayerStanding[]
  readonly roundSummaries: readonly RoundSummary[]
  readonly scoreHistory: readonly ScoreEvent[]
}
