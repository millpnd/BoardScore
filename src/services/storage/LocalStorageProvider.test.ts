import { describe, expect, it, vi } from 'vitest'

import {
  LocalStorageProvider,
  type LocalStorageLike,
} from './LocalStorageProvider'
import { StorageProviderError } from './StorageError'

class MemoryLocalStorage implements LocalStorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

describe('LocalStorageProvider', () => {
  it('reads, writes, and removes values through an injected browser API', async () => {
    const localStorage = new MemoryLocalStorage()
    const provider = new LocalStorageProvider(localStorage)

    await provider.setItem('key', 'value')
    expect(await provider.getItem('key')).toBe('value')
    await provider.removeItem('key')
    expect(await provider.getItem('key')).toBeNull()
  })

  it('uses browser Local Storage when no implementation is injected', async () => {
    const localStorage = new MemoryLocalStorage()
    vi.stubGlobal('localStorage', localStorage)

    try {
      const provider = new LocalStorageProvider()
      await provider.setItem('key', 'browser-value')
      expect(await provider.getItem('key')).toBe('browser-value')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports unavailable Local Storage', async () => {
    await expect(new LocalStorageProvider().getItem('key')).rejects.toEqual(
      expect.objectContaining<Partial<StorageProviderError>>({
        code: 'STORAGE_UNAVAILABLE',
      }),
    )
  })

  it.each([
    ['READ_FAILED', 'getItem'],
    ['WRITE_FAILED', 'setItem'],
    ['DELETE_FAILED', 'removeItem'],
  ] as const)('reports %s provider errors', async (code, method) => {
    const storage: LocalStorageLike = {
      getItem: () => {
        if (method === 'getItem') throw new Error('read failed')
        return null
      },
      setItem: () => {
        if (method === 'setItem') throw new Error('write failed')
      },
      removeItem: () => {
        if (method === 'removeItem') throw new Error('delete failed')
      },
    }
    const provider = new LocalStorageProvider(storage)
    const operation =
      method === 'getItem'
        ? provider.getItem('key')
        : method === 'setItem'
          ? provider.setItem('key', 'value')
          : provider.removeItem('key')

    await expect(operation).rejects.toEqual(
      expect.objectContaining<Partial<StorageProviderError>>({ code }),
    )
  })
})
