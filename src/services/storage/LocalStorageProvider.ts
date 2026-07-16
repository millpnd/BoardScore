import type { StorageProvider } from './contracts'
import { StorageProviderError } from './StorageError'

export interface LocalStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly injectedStorage?: LocalStorageLike) {}

  async getItem(key: string): Promise<string | null> {
    try {
      return this.getStorage().getItem(key)
    } catch (error) {
      this.rethrowProviderError(error)
      throw new StorageProviderError(
        'READ_FAILED',
        `Unable to read storage key "${key}".`,
        error,
      )
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.getStorage().setItem(key, value)
    } catch (error) {
      this.rethrowProviderError(error)
      throw new StorageProviderError(
        'WRITE_FAILED',
        `Unable to write storage key "${key}".`,
        error,
      )
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.getStorage().removeItem(key)
    } catch (error) {
      this.rethrowProviderError(error)
      throw new StorageProviderError(
        'DELETE_FAILED',
        `Unable to delete storage key "${key}".`,
        error,
      )
    }
  }

  private getStorage(): LocalStorageLike {
    if (this.injectedStorage) return this.injectedStorage

    try {
      if (!globalThis.localStorage) throw new Error('Local Storage is missing.')
      return globalThis.localStorage
    } catch (error) {
      throw new StorageProviderError(
        'STORAGE_UNAVAILABLE',
        'Local Storage is unavailable.',
        error,
      )
    }
  }

  private rethrowProviderError(error: unknown): void {
    if (error instanceof StorageProviderError) throw error
  }
}
