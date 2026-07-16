export type ScoreEngineErrorCode =
  | 'DUPLICATE_EVENT'
  | 'EVENT_NOT_FOUND'
  | 'INVALID_EVENT'
  | 'INVALID_ROUND'
  | 'INVALID_SESSION'
  | 'INVALID_TEMPLATE'
  | 'MISSING_SESSION'
  | 'PLAYER_NOT_FOUND'
  | 'SESSION_NOT_ACTIVE'

export class ScoreEngineError extends Error {
  constructor(
    readonly code: ScoreEngineErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ScoreEngineError'
  }
}
