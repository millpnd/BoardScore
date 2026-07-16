import type { GameTemplate } from '../../models'
import { builtInTemplates } from './builtInTemplates'
import { TemplateEngineError } from './TemplateEngineError'
import {
  validateGameTemplate,
  type TemplateValidationResult,
} from './templateValidation'

const cloneTemplate = (template: GameTemplate): GameTemplate => ({
  ...template,
  roundConfiguration: { ...template.roundConfiguration },
})

export class TemplateEngine {
  private templates = new Map<string, GameTemplate>()

  constructor(
    private readonly builtIns: readonly unknown[] = builtInTemplates,
  ) {}

  /** Atomically replaces engine contents with validated built-in and custom templates. */
  loadTemplates(customTemplates: readonly unknown[] = []): void {
    const loaded = new Map<string, GameTemplate>()

    for (const candidate of this.builtIns) {
      const template = this.requireValid(candidate)
      if (!template.isBuiltIn) {
        throw new TemplateEngineError(
          'BUILT_IN_REQUIRED',
          `Built-in template "${template.id}" must set isBuiltIn to true.`,
        )
      }
      this.addUnique(loaded, template)
    }

    for (const candidate of customTemplates) {
      const template = this.requireValid(candidate)
      if (template.isBuiltIn) {
        throw new TemplateEngineError(
          'CUSTOM_REQUIRED',
          `Custom template "${template.id}" must set isBuiltIn to false.`,
        )
      }
      this.addUnique(loaded, template)
    }

    this.templates = loaded
  }

  getTemplate(id: string): GameTemplate | undefined {
    const template = this.templates.get(id)
    return template ? cloneTemplate(template) : undefined
  }

  getTemplates(): readonly GameTemplate[] {
    return [...this.templates.values()].map(cloneTemplate)
  }

  getCustomTemplates(): readonly GameTemplate[] {
    return this.getTemplates().filter((template) => !template.isBuiltIn)
  }

  registerTemplate(candidate: unknown): GameTemplate {
    const template = this.requireValid(candidate)
    this.requireCustom(template)
    this.addUnique(this.templates, template)
    return cloneTemplate(template)
  }

  updateTemplate(candidate: unknown): GameTemplate {
    const template = this.requireValid(candidate)
    const existing = this.templates.get(template.id)

    if (!existing) {
      throw new TemplateEngineError(
        'NOT_FOUND',
        `Template "${template.id}" was not found.`,
      )
    }
    this.requireCustom(existing)
    this.requireCustom(template)
    this.templates.set(template.id, cloneTemplate(template))
    return cloneTemplate(template)
  }

  removeTemplate(id: string): void {
    const template = this.templates.get(id)
    if (!template) {
      throw new TemplateEngineError(
        'NOT_FOUND',
        `Template "${id}" was not found.`,
      )
    }
    this.requireCustom(template)
    this.templates.delete(id)
  }

  validateTemplate(candidate: unknown): TemplateValidationResult {
    return validateGameTemplate(candidate)
  }

  private requireValid(candidate: unknown): GameTemplate {
    const result = this.validateTemplate(candidate)
    if (result.valid) return result.template

    throw new TemplateEngineError(
      'VALIDATION_FAILED',
      result.errors
        .map(({ field, message }) => `${field}: ${message}`)
        .join(' '),
    )
  }

  private requireCustom(template: GameTemplate): void {
    if (template.isBuiltIn) {
      throw new TemplateEngineError(
        'CUSTOM_REQUIRED',
        `Built-in template "${template.id}" cannot be changed or removed.`,
      )
    }
  }

  private addUnique(
    destination: Map<string, GameTemplate>,
    template: GameTemplate,
  ): void {
    if (destination.has(template.id)) {
      throw new TemplateEngineError(
        'DUPLICATE_ID',
        `Template ID "${template.id}" already exists.`,
      )
    }
    destination.set(template.id, cloneTemplate(template))
  }
}
