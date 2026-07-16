import type { EntityId } from '../../models'

export type SettingValue = boolean | number | string | null

/** Extensible persisted preferences; unknown future fields remain provider-neutral. */
export interface ApplicationSettings {
  readonly theme?: string
  readonly lastSelectedGameId?: EntityId
  readonly preferences?: Readonly<Record<string, SettingValue>>
}
