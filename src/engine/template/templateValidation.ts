import type { GameTemplate } from '../../models'
import { RoundType, ScoringType, WinnerRule } from '../../models'

export interface TemplateValidationError {
  readonly field: string
  readonly message: string
}

export type TemplateValidationResult =
  | {
      readonly valid: true
      readonly template: GameTemplate
      readonly errors: readonly []
    }
  | {
      readonly valid: false
      readonly errors: readonly TemplateValidationError[]
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEnumValue = <Value extends string>(
  values: readonly Value[],
  value: unknown,
): value is Value =>
  typeof value === 'string' && values.includes(value as Value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

const addRequiredStringError = (
  template: Record<string, unknown>,
  field: string,
  errors: TemplateValidationError[],
) => {
  if (!isNonEmptyString(template[field])) {
    errors.push({ field, message: `${field} must be a non-empty string.` })
  }
}

const validatePlayerLimits = (
  template: Record<string, unknown>,
  errors: TemplateValidationError[],
) => {
  const minimum = template.minimumPlayers
  const maximum = template.maximumPlayers

  if (!isPositiveInteger(minimum) || minimum < 2) {
    errors.push({
      field: 'minimumPlayers',
      message: 'minimumPlayers must be an integer greater than or equal to 2.',
    })
  }

  if (maximum !== null && !isPositiveInteger(maximum)) {
    errors.push({
      field: 'maximumPlayers',
      message: 'maximumPlayers must be null or a positive integer.',
    })
  } else if (
    isPositiveInteger(minimum) &&
    isPositiveInteger(maximum) &&
    maximum < minimum
  ) {
    errors.push({
      field: 'maximumPlayers',
      message:
        'maximumPlayers must be greater than or equal to minimumPlayers.',
    })
  }
}

const validateRoundConfiguration = (
  value: unknown,
  errors: TemplateValidationError[],
) => {
  if (!isRecord(value)) {
    errors.push({
      field: 'roundConfiguration',
      message: 'roundConfiguration must be an object.',
    })
    return
  }

  if (!isEnumValue(Object.values(RoundType), value.type)) {
    errors.push({
      field: 'roundConfiguration.type',
      message: 'roundConfiguration.type must be unlimited or fixed.',
    })
    return
  }

  if (value.type === RoundType.Fixed && !isPositiveInteger(value.totalRounds)) {
    errors.push({
      field: 'roundConfiguration.totalRounds',
      message: 'totalRounds must be a positive integer for fixed rounds.',
    })
  }
}

export const validateGameTemplate = (
  candidate: unknown,
): TemplateValidationResult => {
  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: [{ field: 'template', message: 'Template must be an object.' }],
    }
  }

  const errors: TemplateValidationError[] = []
  for (const field of ['id', 'name', 'description', 'icon']) {
    addRequiredStringError(candidate, field, errors)
  }

  validatePlayerLimits(candidate, errors)

  if (!isEnumValue(Object.values(ScoringType), candidate.scoringType)) {
    errors.push({
      field: 'scoringType',
      message: 'scoringType must be a supported ScoringType value.',
    })
  }

  if (!isEnumValue(Object.values(WinnerRule), candidate.winnerRule)) {
    errors.push({
      field: 'winnerRule',
      message: 'winnerRule must be a supported WinnerRule value.',
    })
  }

  validateRoundConfiguration(candidate.roundConfiguration, errors)

  if (candidate.theme !== undefined && !isNonEmptyString(candidate.theme)) {
    errors.push({
      field: 'theme',
      message: 'theme must be a non-empty string when provided.',
    })
  }

  if (typeof candidate.isBuiltIn !== 'boolean') {
    errors.push({ field: 'isBuiltIn', message: 'isBuiltIn must be a boolean.' })
  }

  if (!isPositiveInteger(candidate.version)) {
    errors.push({
      field: 'version',
      message: 'version must be a positive integer.',
    })
  }

  return errors.length > 0
    ? { valid: false, errors }
    : {
        valid: true,
        template: candidate as unknown as GameTemplate,
        errors: [],
      }
}
