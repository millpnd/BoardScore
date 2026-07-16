import type { GameSession, ScoreEvent } from '../../models'
import { ScoreEventType } from '../../models'
import { ScoreEngine, ScoreEngineError } from '../score'
import { UndoEngineError } from './UndoEngineError'
import {
  UndoActionType,
  type AddScoreEventAction,
  type DeleteScoreEventAction,
  type UndoAction,
  type UndoMetadata,
  type UndoResult,
  type UpdateScoreEventAction,
} from './types'

type SessionInput = GameSession | null | undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isMetadata = (value: unknown): value is UndoMetadata =>
  isRecord(value) &&
  Object.values(value).every(
    (item) =>
      item === null ||
      typeof item === 'boolean' ||
      typeof item === 'number' ||
      typeof item === 'string',
  )

const isScoreEvent = (value: unknown): value is ScoreEvent =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.playerId) &&
  (value.roundId === undefined || isNonEmptyString(value.roundId)) &&
  Object.values(ScoreEventType).includes(value.type as ScoreEventType) &&
  typeof value.points === 'number' &&
  Number.isFinite(value.points) &&
  isNonEmptyString(value.createdAt)

const eventsEqual = (left: ScoreEvent, right: ScoreEvent): boolean =>
  left.id === right.id &&
  left.playerId === right.playerId &&
  left.roundId === right.roundId &&
  left.type === right.type &&
  left.points === right.points &&
  left.createdAt === right.createdAt

const cloneEvent = (event: ScoreEvent): ScoreEvent => ({ ...event })

const cloneMetadata = (
  metadata: UndoMetadata | undefined,
): UndoMetadata | undefined => (metadata ? { ...metadata } : undefined)

const cloneAction = (action: UndoAction): UndoAction => {
  switch (action.type) {
    case UndoActionType.AddScoreEvent:
      return {
        ...action,
        metadata: cloneMetadata(action.metadata),
        currentEvent: cloneEvent(action.currentEvent),
      }
    case UndoActionType.UpdateScoreEvent:
      return {
        ...action,
        metadata: cloneMetadata(action.metadata),
        previousEvent: cloneEvent(action.previousEvent),
        currentEvent: cloneEvent(action.currentEvent),
      }
    case UndoActionType.DeleteScoreEvent:
      return {
        ...action,
        metadata: cloneMetadata(action.metadata),
        previousEvent: cloneEvent(action.previousEvent),
      }
  }
}

export class UndoEngine {
  private history: UndoAction[] = []

  constructor(private readonly scoreEngine: ScoreEngine = new ScoreEngine()) {}

  recordAction(sessionInput: SessionInput, actionInput: UndoAction): void {
    const session = this.requireSession(sessionInput)
    const action = this.requireValidAction(actionInput)
    if (action.sessionId !== session.id) {
      throw new UndoEngineError(
        'INVALID_ACTION',
        `Undo action belongs to session "${action.sessionId}", not "${session.id}".`,
      )
    }
    if (this.history.some(({ id }) => id === action.id)) {
      throw new UndoEngineError(
        'DUPLICATE_ACTION',
        `Undo action "${action.id}" already exists.`,
      )
    }

    this.requireValidSession(session)
    this.requireActionMatchesSession(session, action)
    this.history.push(cloneAction(action))
  }

  undo(sessionInput: SessionInput): UndoResult {
    const session = this.requireSession(sessionInput)
    const action = this.history.at(-1)
    if (!action) {
      throw new UndoEngineError('NO_HISTORY', 'No action is available to undo.')
    }
    if (action.sessionId !== session.id) {
      throw new UndoEngineError(
        'CORRUPTED_HISTORY',
        `Latest undo action does not belong to session "${session.id}".`,
      )
    }

    this.requireUndoState(session, action)
    const restoredSession = this.restore(session, action)

    try {
      const calculation = this.scoreEngine.recalculate(restoredSession)
      this.history.pop()
      return {
        session: restoredSession,
        calculation,
        action: cloneAction(action),
      }
    } catch (error) {
      throw new UndoEngineError(
        'INVALID_RESTORATION',
        'Undo produced an invalid game session.',
        error,
      )
    }
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  clearHistory(): void {
    this.history = []
  }

  getHistory(): readonly UndoAction[] {
    return this.history.map(cloneAction)
  }

  private requireSession(sessionInput: SessionInput): GameSession {
    if (!sessionInput) {
      throw new UndoEngineError(
        'MISSING_SESSION',
        'A game session is required for undo operations.',
      )
    }
    return sessionInput
  }

  private requireValidSession(session: GameSession): void {
    try {
      this.scoreEngine.recalculate(session)
    } catch (error) {
      throw new UndoEngineError(
        'INVALID_SESSION',
        'Cannot record an action for an invalid game session.',
        error,
      )
    }
  }

  private requireValidAction(actionInput: UndoAction): UndoAction {
    const action: unknown = actionInput
    if (
      !isRecord(action) ||
      !isNonEmptyString(action.id) ||
      !isNonEmptyString(action.sessionId) ||
      !isNonEmptyString(action.timestamp) ||
      !Object.values(UndoActionType).includes(action.type as UndoActionType) ||
      (action.metadata !== undefined && !isMetadata(action.metadata))
    ) {
      throw new UndoEngineError(
        'INVALID_ACTION',
        'Undo action has invalid identity, type, timestamp, or metadata.',
      )
    }

    switch (action.type) {
      case UndoActionType.AddScoreEvent:
        if (action.previousEvent !== null || !isScoreEvent(action.currentEvent))
          break
        return action as unknown as AddScoreEventAction
      case UndoActionType.UpdateScoreEvent:
        if (
          !isScoreEvent(action.previousEvent) ||
          !isScoreEvent(action.currentEvent) ||
          action.previousEvent.id !== action.currentEvent.id ||
          eventsEqual(action.previousEvent, action.currentEvent)
        )
          break
        return action as unknown as UpdateScoreEventAction
      case UndoActionType.DeleteScoreEvent:
        if (
          !isScoreEvent(action.previousEvent) ||
          action.currentEvent !== null ||
          !Number.isInteger(action.eventIndex) ||
          (action.eventIndex as number) < 0
        )
          break
        return action as unknown as DeleteScoreEventAction
    }

    throw new UndoEngineError(
      'INVALID_ACTION',
      `Undo action "${action.id}" has invalid score-event state.`,
    )
  }

  private requireActionMatchesSession(
    session: GameSession,
    action: UndoAction,
  ): void {
    switch (action.type) {
      case UndoActionType.AddScoreEvent:
      case UndoActionType.UpdateScoreEvent: {
        const current = session.scoreEvents.find(
          ({ id }) => id === action.currentEvent.id,
        )
        if (!current || !eventsEqual(current, action.currentEvent)) {
          throw new UndoEngineError(
            'MISSING_SCORE_EVENT',
            `Current score event "${action.currentEvent.id}" is missing or changed.`,
          )
        }
        return
      }
      case UndoActionType.DeleteScoreEvent:
        if (
          session.scoreEvents.some(
            ({ id }) => id === action.previousEvent.id,
          ) ||
          action.eventIndex > session.scoreEvents.length
        ) {
          throw new UndoEngineError(
            'INVALID_ACTION',
            `Deleted score event "${action.previousEvent.id}" is not restorable.`,
          )
        }
    }
  }

  private requireUndoState(session: GameSession, action: UndoAction): void {
    try {
      this.requireValidSession(session)
      this.requireActionMatchesSession(session, action)
    } catch (error) {
      throw new UndoEngineError(
        'CORRUPTED_HISTORY',
        `Current session no longer matches undo action "${action.id}".`,
        error,
      )
    }
  }

  private restore(session: GameSession, action: UndoAction): GameSession {
    try {
      switch (action.type) {
        case UndoActionType.AddScoreEvent:
          return this.scoreEngine.removeScoreEvent(
            session,
            action.currentEvent.id,
          )
        case UndoActionType.UpdateScoreEvent:
          return this.scoreEngine.updateScoreEvent(
            session,
            cloneEvent(action.previousEvent),
          )
        case UndoActionType.DeleteScoreEvent: {
          const appended = this.scoreEngine.addScoreEvent(
            session,
            cloneEvent(action.previousEvent),
          )
          const withoutAppended = appended.scoreEvents.slice(0, -1)
          return {
            ...appended,
            scoreEvents: [
              ...withoutAppended.slice(0, action.eventIndex),
              cloneEvent(action.previousEvent),
              ...withoutAppended.slice(action.eventIndex),
            ],
          }
        }
      }
    } catch (error) {
      if (!(error instanceof ScoreEngineError)) throw error
      throw new UndoEngineError(
        'INVALID_RESTORATION',
        `Failed to restore action "${action.id}": ${error.message}`,
        error,
      )
    }
  }
}
