import type { GameSession, GameTemplate } from '../../models'
import { GameSessionStatus } from '../../models'
import type {
  Serializer,
  SessionStorage,
  SettingsStorage,
  StorageProvider,
  TemplateStorage,
} from './contracts'
import { StorageError } from './StorageError'
import { STORAGE_KEYS, STORAGE_VERSION } from './storageKeys'
import type { ApplicationSettings } from './types'
import {
  isApplicationSettings,
  isCustomTemplateArray,
  isGameSession,
  isGameTemplateArray,
} from './validators'
import { VersionedJsonSerializer } from './VersionedJsonSerializer'

export class StorageService
  implements SessionStorage, TemplateStorage, SettingsStorage
{
  constructor(
    private readonly provider: StorageProvider,
    private readonly serializer: Serializer = new VersionedJsonSerializer(
      STORAGE_VERSION,
    ),
  ) {}

  async saveSession(session: GameSession): Promise<void> {
    if (!isGameSession(session)) {
      throw new StorageError(
        'INVALID_DATA',
        'Game session has an invalid shape.',
      )
    }
    if (session.status === GameSessionStatus.Completed) {
      throw new StorageError(
        'INVALID_DATA',
        'Completed game sessions must not be persisted.',
      )
    }
    await this.write(STORAGE_KEYS.activeSession, session)
  }

  async loadSession(): Promise<GameSession | null> {
    const session = await this.read(STORAGE_KEYS.activeSession, isGameSession)
    if (session?.status === GameSessionStatus.Completed) {
      throw new StorageError(
        'CORRUPTED_DATA',
        'Persisted active session is already completed.',
      )
    }
    return session
  }

  async hasSession(): Promise<boolean> {
    return (await this.provider.getItem(STORAGE_KEYS.activeSession)) !== null
  }

  async deleteSession(): Promise<void> {
    await this.provider.removeItem(STORAGE_KEYS.activeSession)
  }

  async saveTemplate(template: GameTemplate): Promise<void> {
    this.requireCustomTemplate(template)
    const templates = await this.getTemplates()
    if (templates.some(({ id }) => id === template.id)) {
      throw new StorageError(
        'CONFLICT',
        `Custom template "${template.id}" already exists.`,
      )
    }
    await this.write(STORAGE_KEYS.customTemplates, [...templates, template])
  }

  async updateTemplate(template: GameTemplate): Promise<void> {
    this.requireCustomTemplate(template)
    const templates = await this.getTemplates()
    if (!templates.some(({ id }) => id === template.id)) {
      throw new StorageError(
        'NOT_FOUND',
        `Custom template "${template.id}" was not found.`,
      )
    }
    await this.write(
      STORAGE_KEYS.customTemplates,
      templates.map((current) =>
        current.id === template.id ? template : current,
      ),
    )
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates()
    if (!templates.some((template) => template.id === id)) {
      throw new StorageError(
        'NOT_FOUND',
        `Custom template "${id}" was not found.`,
      )
    }
    await this.write(
      STORAGE_KEYS.customTemplates,
      templates.filter((template) => template.id !== id),
    )
  }

  async getTemplates(): Promise<readonly GameTemplate[]> {
    return (
      (await this.read(STORAGE_KEYS.customTemplates, isCustomTemplateArray)) ??
      []
    )
  }

  async saveSettings(settings: ApplicationSettings): Promise<void> {
    if (!isApplicationSettings(settings)) {
      throw new StorageError(
        'INVALID_DATA',
        'Application settings have an invalid shape.',
      )
    }
    await this.write(STORAGE_KEYS.settings, settings)
  }

  async loadSettings(): Promise<ApplicationSettings | null> {
    return this.read(STORAGE_KEYS.settings, isApplicationSettings)
  }

  async deleteSettings(): Promise<void> {
    await this.provider.removeItem(STORAGE_KEYS.settings)
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.deleteSession(),
      this.provider.removeItem(STORAGE_KEYS.customTemplates),
      this.deleteSettings(),
    ])
  }

  private async read<Value>(
    key: string,
    validator: (value: unknown) => value is Value,
  ): Promise<Value | null> {
    const serialized = await this.provider.getItem(key)
    return serialized === null
      ? null
      : this.serializer.deserialize(serialized, validator)
  }

  private async write<Value>(key: string, value: Value): Promise<void> {
    await this.provider.setItem(key, this.serializer.serialize(value))
  }

  private requireCustomTemplate(template: GameTemplate): void {
    if (template.isBuiltIn) {
      throw new StorageError(
        'INVALID_DATA',
        'Built-in templates must not be persisted as custom templates.',
      )
    }
    if (!isGameTemplateArray([template])) {
      throw new StorageError(
        'INVALID_DATA',
        'Custom template has an invalid shape.',
      )
    }
  }
}
