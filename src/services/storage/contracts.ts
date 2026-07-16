import type { GameSession, GameTemplate } from '../../models'
import type { ApplicationSettings } from './types'

export interface StorageProvider {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export type DataValidator<Value> = (value: unknown) => value is Value

export interface Serializer {
  serialize<Value>(value: Value): string
  deserialize<Value>(serialized: string, validator: DataValidator<Value>): Value
}

export interface SessionStorage {
  saveSession(session: GameSession): Promise<void>
  loadSession(): Promise<GameSession | null>
  hasSession(): Promise<boolean>
  deleteSession(): Promise<void>
}

export interface TemplateStorage {
  saveTemplate(template: GameTemplate): Promise<void>
  updateTemplate(template: GameTemplate): Promise<void>
  deleteTemplate(id: string): Promise<void>
  getTemplates(): Promise<readonly GameTemplate[]>
}

export interface SettingsStorage {
  saveSettings(settings: ApplicationSettings): Promise<void>
  loadSettings(): Promise<ApplicationSettings | null>
  deleteSettings(): Promise<void>
}
