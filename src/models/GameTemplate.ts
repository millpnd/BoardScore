import type { EntityId } from './types'
import { RoundType, ScoringType, WinnerRule } from './types'

export interface UnlimitedRoundConfiguration {
  readonly type: RoundType.Unlimited
}

export interface FixedRoundConfiguration {
  readonly type: RoundType.Fixed
  readonly totalRounds: number
}

export type RoundConfiguration =
  UnlimitedRoundConfiguration | FixedRoundConfiguration

/** Configuration consumed by scoring engines; never contains game-specific code. */
export interface GameTemplate {
  readonly id: EntityId
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly minimumPlayers: number
  /** Null means no upper player limit. */
  readonly maximumPlayers: number | null
  readonly scoringType: ScoringType
  readonly winnerRule: WinnerRule
  readonly roundConfiguration: RoundConfiguration
  readonly theme?: string
  readonly isBuiltIn: boolean
  /** Schema version reserved for future template migrations. */
  readonly version: number
}
