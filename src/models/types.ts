/** ISO 8601 timestamp stored as a string for serialization portability. */
export type IsoDateTime = string

/** Stable identifier supplied by the application boundary. */
export type EntityId = string

export enum ScoringType {
  RunningTotal = 'running-total',
  PerRound = 'per-round',
}

export enum WinnerRule {
  HighestScore = 'highest-score',
  LowestScore = 'lowest-score',
}

export enum RoundType {
  Unlimited = 'unlimited',
  Fixed = 'fixed',
}

export enum ScoreEventType {
  Score = 'score',
  Correction = 'correction',
}

export enum GameSessionStatus {
  Active = 'active',
  Completed = 'completed',
}
