import type { DataValidator, Serializer } from './contracts'
import { StorageError } from './StorageError'

interface StorageEnvelope {
  readonly version: number
  readonly data: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export class VersionedJsonSerializer implements Serializer {
  constructor(private readonly currentVersion: number) {
    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
      throw new StorageError(
        'INVALID_DATA',
        'Storage version must be a positive integer.',
      )
    }
  }

  serialize<Value>(value: Value): string {
    try {
      if (value === undefined) {
        throw new Error('Cannot serialize undefined storage data.')
      }
      const serialized = JSON.stringify({
        version: this.currentVersion,
        data: value,
      })
      return serialized
    } catch (error) {
      throw new StorageError(
        'SERIALIZATION_FAILED',
        'Unable to serialize storage data.',
        error,
      )
    }
  }

  deserialize<Value>(
    serialized: string,
    validator: DataValidator<Value>,
  ): Value {
    let parsed: unknown
    try {
      parsed = JSON.parse(serialized)
    } catch (error) {
      throw new StorageError(
        'INVALID_JSON',
        'Persisted data is not valid JSON.',
        error,
      )
    }

    if (
      !isRecord(parsed) ||
      !Number.isInteger(parsed.version) ||
      !Object.hasOwn(parsed, 'data')
    ) {
      throw new StorageError(
        'CORRUPTED_DATA',
        'Persisted data has an invalid storage envelope.',
      )
    }

    const envelope = parsed as unknown as StorageEnvelope
    if (envelope.version !== this.currentVersion) {
      throw new StorageError(
        'VERSION_MISMATCH',
        `Storage version ${envelope.version} is unsupported; expected ${this.currentVersion}.`,
      )
    }
    if (!validator(envelope.data)) {
      throw new StorageError(
        'CORRUPTED_DATA',
        'Persisted data does not match the expected schema.',
      )
    }
    return envelope.data
  }
}
