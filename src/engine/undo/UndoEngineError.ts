export type UndoEngineErrorCode =
  | 'CORRUPTED_HISTORY'
  | 'DUPLICATE_ACTION'
  | 'INVALID_ACTION'
  | 'INVALID_RESTORATION'
  | 'INVALID_SESSION'
  | 'MISSING_SCORE_EVENT'
  | 'MISSING_SESSION'
  | 'NO_HISTORY'

export class UndoEngineError extends Error {
  constructor(
    readonly code: UndoEngineErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'UndoEngineError'
  }
}
