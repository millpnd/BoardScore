import type { PlayerStanding } from '../score'

export interface WinnerStanding extends PlayerStanding {
  readonly isWinner: boolean
}

export interface WinnerResult {
  readonly standings: readonly WinnerStanding[]
  readonly winners: readonly WinnerStanding[]
  readonly isTie: boolean
}
