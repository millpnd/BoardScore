import { describe, expect, it } from 'vitest'

import { StorageError } from './StorageError'
import { VersionedJsonSerializer } from './VersionedJsonSerializer'

const isMessage = (value: unknown): value is { message: string } =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof value.message === 'string'

describe('VersionedJsonSerializer', () => {
  it('serializes and deserializes a versioned envelope', () => {
    const serializer = new VersionedJsonSerializer(1)
    const serialized = serializer.serialize({ message: 'saved' })

    expect(JSON.parse(serialized)).toEqual({
      version: 1,
      data: { message: 'saved' },
    })
    expect(serializer.deserialize(serialized, isMessage)).toEqual({
      message: 'saved',
    })
  })

  it('rejects invalid serializer versions', () => {
    expect(() => new VersionedJsonSerializer(0)).toThrowError(
      expect.objectContaining<Partial<StorageError>>({ code: 'INVALID_DATA' }),
    )
  })

  it('reports serialization failures', () => {
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic

    expect(() => new VersionedJsonSerializer(1).serialize(cyclic)).toThrowError(
      expect.objectContaining<Partial<StorageError>>({
        code: 'SERIALIZATION_FAILED',
      }),
    )

    expect(() =>
      new VersionedJsonSerializer(1).serialize(undefined),
    ).toThrowError(
      expect.objectContaining<Partial<StorageError>>({
        code: 'SERIALIZATION_FAILED',
      }),
    )
  })

  it('reports invalid JSON', () => {
    expect(() =>
      new VersionedJsonSerializer(1).deserialize('{bad json', isMessage),
    ).toThrowError(
      expect.objectContaining<Partial<StorageError>>({ code: 'INVALID_JSON' }),
    )
  })

  it.each(['null', '[]', '{}', '{"version":"1","data":{}}', '{"version":1}'])(
    'rejects corrupted envelope %s',
    (serialized) => {
      expect(() =>
        new VersionedJsonSerializer(1).deserialize(serialized, isMessage),
      ).toThrowError(
        expect.objectContaining<Partial<StorageError>>({
          code: 'CORRUPTED_DATA',
        }),
      )
    },
  )

  it('rejects unsupported storage versions', () => {
    expect(() =>
      new VersionedJsonSerializer(1).deserialize(
        '{"version":2,"data":{"message":"saved"}}',
        isMessage,
      ),
    ).toThrowError(
      expect.objectContaining<Partial<StorageError>>({
        code: 'VERSION_MISMATCH',
      }),
    )
  })

  it('rejects data that fails schema validation', () => {
    expect(() =>
      new VersionedJsonSerializer(1).deserialize(
        '{"version":1,"data":{"wrong":true}}',
        isMessage,
      ),
    ).toThrowError(
      expect.objectContaining<Partial<StorageError>>({
        code: 'CORRUPTED_DATA',
      }),
    )
  })
})
