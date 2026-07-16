import type { GameSession, GameTemplate } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import type { ApplicationSettings, SettingValue } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isEnumValue = <Value extends string>(
  values: readonly Value[],
  value: unknown,
): value is Value =>
  typeof value === 'string' && values.includes(value as Value)

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || isString(value)

const isPlayer = (value: unknown): boolean =>
  isRecord(value) && isString(value.id) && isString(value.name)

const isRound = (value: unknown): boolean =>
  isRecord(value) &&
  isString(value.id) &&
  Number.isInteger(value.number) &&
  isString(value.startedAt) &&
  isOptionalString(value.completedAt)

const isScoreEvent = (value: unknown): boolean =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.playerId) &&
  isOptionalString(value.roundId) &&
  isEnumValue(Object.values(ScoreEventType), value.type) &&
  typeof value.points === 'number' &&
  Number.isFinite(value.points) &&
  isString(value.createdAt)

export const isGameTemplate = (value: unknown): value is GameTemplate => {
  if (!isRecord(value) || !isRecord(value.roundConfiguration)) return false
  const roundType = value.roundConfiguration.type
  const validRounds =
    roundType === RoundType.Unlimited ||
    (roundType === RoundType.Fixed &&
      Number.isInteger(value.roundConfiguration.totalRounds))

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.icon) &&
    Number.isInteger(value.minimumPlayers) &&
    (value.maximumPlayers === null || Number.isInteger(value.maximumPlayers)) &&
    isEnumValue(Object.values(ScoringType), value.scoringType) &&
    isEnumValue(Object.values(WinnerRule), value.winnerRule) &&
    validRounds &&
    isOptionalString(value.theme) &&
    typeof value.isBuiltIn === 'boolean' &&
    Number.isInteger(value.version)
  )
}

export const isGameSession = (value: unknown): value is GameSession =>
  isRecord(value) &&
  isString(value.id) &&
  isGameTemplate(value.template) &&
  Array.isArray(value.players) &&
  value.players.every(isPlayer) &&
  Array.isArray(value.rounds) &&
  value.rounds.every(isRound) &&
  Array.isArray(value.scoreEvents) &&
  value.scoreEvents.every(isScoreEvent) &&
  isEnumValue(Object.values(GameSessionStatus), value.status) &&
  isOptionalString(value.startedAt) &&
  isOptionalString(value.completedAt)

export const isGameTemplateArray = (
  value: unknown,
): value is readonly GameTemplate[] =>
  Array.isArray(value) && value.every(isGameTemplate)

export const isCustomTemplateArray = (
  value: unknown,
): value is readonly GameTemplate[] =>
  isGameTemplateArray(value) && value.every((template) => !template.isBuiltIn)

const isSettingValue = (value: unknown): value is SettingValue =>
  value === null ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  typeof value === 'string'

export const isApplicationSettings = (
  value: unknown,
): value is ApplicationSettings =>
  isRecord(value) &&
  isOptionalString(value.theme) &&
  isOptionalString(value.lastSelectedGameId) &&
  (value.preferences === undefined ||
    (isRecord(value.preferences) &&
      Object.values(value.preferences).every(isSettingValue)))
