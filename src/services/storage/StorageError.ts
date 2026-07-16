export type StorageErrorCode =
  | 'CONFLICT'
  | 'CORRUPTED_DATA'
  | 'INVALID_DATA'
  | 'INVALID_JSON'
  | 'NOT_FOUND'
  | 'SERIALIZATION_FAILED'
  | 'VERSION_MISMATCH'

export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'StorageError'
  }
}

export type StorageProviderErrorCode =
  'DELETE_FAILED' | 'READ_FAILED' | 'STORAGE_UNAVAILABLE' | 'WRITE_FAILED'

export class StorageProviderError extends Error {
  constructor(
    readonly code: StorageProviderErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'StorageProviderError'
  }
}
