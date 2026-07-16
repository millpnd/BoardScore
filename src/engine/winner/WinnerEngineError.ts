export type WinnerEngineErrorCode =
  | 'INVALID_SCORE_OUTPUT'
  | 'INVALID_SESSION'
  | 'INVALID_TEMPLATE'
  | 'MISSING_SESSION'
  | 'MISSING_TEMPLATE'
  | 'UNSUPPORTED_WINNER_RULE'

export class WinnerEngineError extends Error {
  constructor(
    readonly code: WinnerEngineErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'WinnerEngineError'
  }
}
