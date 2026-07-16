export type TemplateEngineErrorCode =
  | 'BUILT_IN_REQUIRED'
  | 'CUSTOM_REQUIRED'
  | 'DUPLICATE_ID'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'

export class TemplateEngineError extends Error {
  constructor(
    readonly code: TemplateEngineErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'TemplateEngineError'
  }
}
