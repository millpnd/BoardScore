import { describe, expect, it } from 'vitest'

import type { GameTemplate } from '../../models'
import { RoundType, ScoringType, WinnerRule } from '../../models'
import { TemplateEngine } from './TemplateEngine'
import { TemplateEngineError } from './TemplateEngineError'

const customTemplate = (
  overrides: Partial<GameTemplate> = {},
): GameTemplate => ({
  id: 'custom-game',
  name: 'Custom Game',
  description: 'A custom game template.',
  icon: 'dice',
  minimumPlayers: 2,
  maximumPlayers: null,
  scoringType: ScoringType.PerRound,
  winnerRule: WinnerRule.HighestScore,
  roundConfiguration: { type: RoundType.Unlimited },
  isBuiltIn: false,
  version: 1,
  ...overrides,
})

const engineError = (action: () => void): TemplateEngineError => {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(TemplateEngineError)
    return error as TemplateEngineError
  }
  throw new Error('Expected TemplateEngineError.')
}

describe('TemplateEngine loading and retrieval', () => {
  it('loads built-in templates from JSON', () => {
    const engine = new TemplateEngine()

    engine.loadTemplates()

    expect(engine.getTemplates()).toHaveLength(3)
    expect(engine.getTemplate('scrabble')).toMatchObject({
      name: 'Scrabble',
      isBuiltIn: true,
    })
    expect(engine.getTemplate('missing')).toBeUndefined()
  })

  it('loads custom templates beside built-ins', () => {
    const engine = new TemplateEngine()
    engine.loadTemplates([customTemplate()])

    expect(engine.getTemplates()).toHaveLength(4)
    expect(engine.getCustomTemplates()).toEqual([customTemplate()])
  })

  it('rejects duplicate IDs without replacing current contents', () => {
    const engine = new TemplateEngine()
    engine.loadTemplates()

    const error = engineError(() =>
      engine.loadTemplates([customTemplate({ id: 'scrabble' })]),
    )

    expect(error.code).toBe('DUPLICATE_ID')
    expect(engine.getTemplates()).toHaveLength(3)
  })

  it('requires correct built-in and custom source flags during loading', () => {
    const customAsBuiltInSource = new TemplateEngine([customTemplate()])
    expect(engineError(() => customAsBuiltInSource.loadTemplates()).code).toBe(
      'BUILT_IN_REQUIRED',
    )

    const engine = new TemplateEngine([])
    expect(
      engineError(() =>
        engine.loadTemplates([customTemplate({ isBuiltIn: true })]),
      ).code,
    ).toBe('CUSTOM_REQUIRED')
  })

  it('returns defensive copies', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates([customTemplate()])

    const first = engine.getTemplate('custom-game') as {
      name: string
      roundConfiguration: { type: RoundType }
    }
    first.name = 'Changed outside engine'
    first.roundConfiguration.type = RoundType.Fixed

    expect(engine.getTemplate('custom-game')).toEqual(customTemplate())
  })
})

describe('TemplateEngine validation', () => {
  it('accepts a valid template', () => {
    const result = new TemplateEngine([]).validateTemplate(customTemplate())

    expect(result).toEqual({
      valid: true,
      template: customTemplate(),
      errors: [],
    })
  })

  it('rejects non-object input', () => {
    const result = new TemplateEngine([]).validateTemplate(null)

    expect(result).toEqual({
      valid: false,
      errors: [{ field: 'template', message: 'Template must be an object.' }],
    })
  })

  it('returns all descriptive field errors', () => {
    const result = new TemplateEngine([]).validateTemplate({
      id: ' ',
      name: '',
      description: null,
      icon: '',
      minimumPlayers: 1,
      maximumPlayers: 0,
      scoringType: 'unknown',
      winnerRule: 'unknown',
      roundConfiguration: null,
      theme: '',
      isBuiltIn: 'yes',
      version: 0,
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.map(({ field }) => field)).toEqual([
        'id',
        'name',
        'description',
        'icon',
        'minimumPlayers',
        'maximumPlayers',
        'scoringType',
        'winnerRule',
        'roundConfiguration',
        'theme',
        'isBuiltIn',
        'version',
      ])
    }
  })

  it('rejects a maximum below the minimum', () => {
    const result = new TemplateEngine([]).validateTemplate(
      customTemplate({ minimumPlayers: 4, maximumPlayers: 3 }),
    )

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors[0]?.field).toBe('maximumPlayers')
    }
  })

  it('validates fixed and unknown round configurations', () => {
    const engine = new TemplateEngine([])

    const missingTotal = engine.validateTemplate(
      customTemplate({
        roundConfiguration: {
          type: RoundType.Fixed,
          totalRounds: 0,
        },
      }),
    )
    expect(missingTotal.valid).toBe(false)

    const unknownType = engine.validateTemplate({
      ...customTemplate(),
      roundConfiguration: { type: 'unknown' },
    })
    expect(unknownType.valid).toBe(false)

    const validFixed = engine.validateTemplate(
      customTemplate({
        roundConfiguration: { type: RoundType.Fixed, totalRounds: 5 },
      }),
    )
    expect(validFixed.valid).toBe(true)
  })

  it('throws aggregated validation details when registering invalid data', () => {
    const error = engineError(() =>
      new TemplateEngine([]).registerTemplate({ id: '' }),
    )

    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.message).toContain('id: id must be a non-empty string.')
    expect(error.name).toBe('TemplateEngineError')
  })
})

describe('TemplateEngine custom template lifecycle', () => {
  it('registers and retrieves a custom template', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates()

    expect(engine.registerTemplate(customTemplate())).toEqual(customTemplate())
    expect(engine.getTemplate('custom-game')).toEqual(customTemplate())
  })

  it('rejects duplicate registration', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates([customTemplate()])

    expect(
      engineError(() => engine.registerTemplate(customTemplate())).code,
    ).toBe('DUPLICATE_ID')
  })

  it('rejects registering a built-in template', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates()

    expect(
      engineError(() =>
        engine.registerTemplate(customTemplate({ isBuiltIn: true })),
      ).code,
    ).toBe('CUSTOM_REQUIRED')
  })

  it('updates a custom template', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates([customTemplate()])
    const updated = customTemplate({ name: 'Updated Game', version: 2 })

    expect(engine.updateTemplate(updated)).toEqual(updated)
    expect(engine.getTemplate('custom-game')).toEqual(updated)
  })

  it('rejects updates for missing or built-in templates', () => {
    const engine = new TemplateEngine()
    engine.loadTemplates()

    expect(
      engineError(() => engine.updateTemplate(customTemplate())).code,
    ).toBe('NOT_FOUND')

    const scrabble = engine.getTemplate('scrabble')
    expect(scrabble).toBeDefined()
    expect(engineError(() => engine.updateTemplate(scrabble)).code).toBe(
      'CUSTOM_REQUIRED',
    )
  })

  it('rejects changing a custom template into a built-in template', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates([customTemplate()])

    expect(
      engineError(() =>
        engine.updateTemplate(customTemplate({ isBuiltIn: true })),
      ).code,
    ).toBe('CUSTOM_REQUIRED')
  })

  it('removes custom templates', () => {
    const engine = new TemplateEngine([])
    engine.loadTemplates([customTemplate()])

    engine.removeTemplate('custom-game')

    expect(engine.getTemplates()).toEqual([])
  })

  it('rejects removal of missing and built-in templates', () => {
    const engine = new TemplateEngine()
    engine.loadTemplates()

    expect(engineError(() => engine.removeTemplate('missing')).code).toBe(
      'NOT_FOUND',
    )
    expect(engineError(() => engine.removeTemplate('scrabble')).code).toBe(
      'CUSTOM_REQUIRED',
    )
  })
})
