export type SessionEngineErrorCode =
  | 'DUPLICATE_PLAYER'
  | 'INVALID_PLAYER'
  | 'INVALID_ROUND'
  | 'INVALID_SCORE_OPERATION'
  | 'INVALID_SESSION'
  | 'INVALID_TEMPLATE'
  | 'INVALID_TRANSITION'
  | 'MISSING_SESSION'
  | 'PLAYER_LIMIT'
  | 'PLAYER_NOT_FOUND'
  | 'ROUND_LIMIT'
  | 'SESSION_ALREADY_EXISTS'
  | 'TEMPLATE_NOT_FOUND'
  | 'UNDO_FAILED'
  | 'WINNER_FAILED'

export class SessionEngineError extends Error {
  constructor(
    readonly code: SessionEngineErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'SessionEngineError'
  }
}
