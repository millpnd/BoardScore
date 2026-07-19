import type {
  EntityId,
  GameSession,
  GameTemplate,
  Player,
  Round,
  ScoreEvent,
} from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
} from '../../models'
import { ScoreEngine, type PlayerTotal } from '../score'
import { TemplateEngine } from '../template'
import {
  UndoActionType,
  UndoEngine,
  type UndoAction,
  type UndoResult,
} from '../undo'
import { WinnerEngine, type WinnerResult, type WinnerStanding } from '../winner'
import { SessionEngineError } from './SessionEngineError'
import type {
  ActionContext,
  CreateSessionInput,
  EndGameResult,
  NextRoundInput,
  PlayerScoreInput,
  SessionSnapshot,
} from './types'

export interface SessionEngineDependencies {
  readonly templateEngine?: TemplateEngine
  readonly scoreEngine?: ScoreEngine
  readonly undoEngine?: UndoEngine
  readonly winnerEngine?: WinnerEngine
}

const cloneTemplate = (template: GameTemplate): GameTemplate => ({
  ...template,
  roundConfiguration: { ...template.roundConfiguration },
})

const cloneSession = (session: GameSession): GameSession => ({
  ...session,
  template: cloneTemplate(session.template),
  players: session.players.map((player) => ({ ...player })),
  rounds: session.rounds.map((round) => ({ ...round })),
  scoreEvents: session.scoreEvents.map((event) => ({ ...event })),
})

const isNonEmpty = (value: string): boolean => value.trim().length > 0

export class SessionEngine {
  private currentSession: GameSession | undefined
  private readonly templateEngine: TemplateEngine
  private readonly scoreEngine: ScoreEngine
  private readonly undoEngine: UndoEngine
  private readonly winnerEngine: WinnerEngine

  constructor(dependencies: SessionEngineDependencies = {}) {
    this.templateEngine = dependencies.templateEngine ?? new TemplateEngine()
    this.scoreEngine = dependencies.scoreEngine ?? new ScoreEngine()
    this.undoEngine =
      dependencies.undoEngine ?? new UndoEngine(this.scoreEngine)
    this.winnerEngine =
      dependencies.winnerEngine ?? new WinnerEngine(this.scoreEngine)

    if (!dependencies.templateEngine) this.templateEngine.loadTemplates()
  }

  createSession(input: CreateSessionInput): GameSession {
    if (this.currentSession) {
      throw new SessionEngineError(
        'SESSION_ALREADY_EXISTS',
        `Session "${this.currentSession.id}" already exists.`,
      )
    }
    if (!isNonEmpty(input.id)) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Session ID must be a non-empty string.',
      )
    }

    const template = this.templateEngine.getTemplate(input.templateId)
    if (!template) {
      throw new SessionEngineError(
        'TEMPLATE_NOT_FOUND',
        `Template "${input.templateId}" was not found.`,
      )
    }
    if (!this.templateEngine.validateTemplate(template).valid) {
      throw new SessionEngineError(
        'INVALID_TEMPLATE',
        `Template "${input.templateId}" is invalid.`,
      )
    }

    this.undoEngine.clearHistory()
    return this.commit({
      id: input.id,
      template,
      players: [],
      rounds: [],
      scoreEvents: [],
      status: GameSessionStatus.NotStarted,
    })
  }

  resumeSession(session: GameSession): GameSession {
    if (this.currentSession) {
      throw new SessionEngineError(
        'SESSION_ALREADY_EXISTS',
        `Session "${this.currentSession.id}" already exists.`,
      )
    }
    if (session.status === GameSessionStatus.Completed) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'A completed game session cannot be resumed.',
      )
    }

    try {
      this.scoreEngine.recalculate(session)
    } catch (error) {
      throw new SessionEngineError(
        'INVALID_SESSION',
        'Persisted game session is invalid.',
        error,
      )
    }

    this.undoEngine.clearHistory()
    return this.commit(session)
  }

  discardSession(): void {
    this.currentSession = undefined
    this.undoEngine.clearHistory()
  }

  addPlayer(player: Player): GameSession {
    const session = this.requirePlayerSetup()
    this.requireValidPlayer(player)
    if (session.players.some(({ id }) => id === player.id)) {
      throw new SessionEngineError(
        'DUPLICATE_PLAYER',
        `Player "${player.id}" already exists.`,
      )
    }
    this.requireUniquePlayerName(session, player.name)
    const maximum = session.template.maximumPlayers
    if (maximum !== null && session.players.length >= maximum) {
      throw new SessionEngineError(
        'PLAYER_LIMIT',
        `Template allows at most ${maximum} players.`,
      )
    }

    return this.commit({
      ...session,
      players: [...session.players, { ...player }],
    })
  }

  removePlayer(playerId: EntityId): GameSession {
    const session = this.requirePlayerSetup()
    this.requirePlayer(session, playerId)
    return this.commit({
      ...session,
      players: session.players.filter(({ id }) => id !== playerId),
    })
  }

  renamePlayer(playerId: EntityId, name: string): GameSession {
    const session = this.requirePlayerSetup()
    this.requirePlayer(session, playerId)
    if (!isNonEmpty(name)) {
      throw new SessionEngineError(
        'INVALID_PLAYER',
        'Player name must be a non-empty string.',
      )
    }
    this.requireUniquePlayerName(session, name, playerId)

    return this.commit({
      ...session,
      players: session.players.map((player) =>
        player.id === playerId ? { ...player, name } : player,
      ),
    })
  }

  startGame(startedAt: string): GameSession {
    const session = this.requirePlayerSetup()
    if (!isNonEmpty(startedAt)) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Game start timestamp must be a non-empty string.',
      )
    }
    if (session.players.length < session.template.minimumPlayers) {
      throw new SessionEngineError(
        'PLAYER_LIMIT',
        `At least ${session.template.minimumPlayers} players are required.`,
      )
    }

    this.undoEngine.clearHistory()
    return this.commit({
      ...session,
      status: GameSessionStatus.Active,
      startedAt,
    })
  }

  endGame(completedAt: string): EndGameResult {
    const session = this.requireActiveSession()
    if (!isNonEmpty(completedAt)) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Game completion timestamp must be a non-empty string.',
      )
    }

    const completed = {
      ...session,
      status: GameSessionStatus.Completed,
      completedAt,
    } satisfies GameSession
    const winner = this.evaluateWinner(completed)
    this.undoEngine.clearHistory()
    return { session: this.commit(completed), winner }
  }

  resetScores(newSessionId: EntityId): GameSession {
    const session = this.requireSession()
    if (session.status !== GameSessionStatus.Completed) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Scores can be reset only after the game is completed.',
      )
    }
    if (!isNonEmpty(newSessionId) || newSessionId === session.id) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Play again requires a new non-empty session ID.',
      )
    }

    this.undoEngine.clearHistory()
    return this.commit({
      id: newSessionId,
      template: session.template,
      players: session.players.map((player) => ({ ...player })),
      rounds: [],
      scoreEvents: [],
      status: GameSessionStatus.NotStarted,
    })
  }

  nextRound(input: NextRoundInput): GameSession {
    const session = this.requireActiveSession()
    if (!isNonEmpty(input.id) || !isNonEmpty(input.startedAt)) {
      throw new SessionEngineError(
        'INVALID_ROUND',
        'Round ID and start timestamp must be non-empty strings.',
      )
    }
    if (session.rounds.some(({ id }) => id === input.id)) {
      throw new SessionEngineError(
        'INVALID_ROUND',
        `Round "${input.id}" already exists.`,
      )
    }

    const nextNumber =
      session.rounds.reduce(
        (maximum, round) => Math.max(maximum, round.number),
        0,
      ) + 1
    if (
      session.template.roundConfiguration.type === RoundType.Fixed &&
      nextNumber > session.template.roundConfiguration.totalRounds
    ) {
      throw new SessionEngineError(
        'ROUND_LIMIT',
        `Template allows ${session.template.roundConfiguration.totalRounds} rounds.`,
      )
    }

    const rounds = session.rounds.map((round, index) =>
      index === session.rounds.length - 1 && !round.completedAt
        ? { ...round, completedAt: input.startedAt }
        : round,
    )
    return this.commit({
      ...session,
      rounds: [
        ...rounds,
        { id: input.id, number: nextNumber, startedAt: input.startedAt },
      ],
    })
  }

  addScore(event: ScoreEvent, context: ActionContext): GameSession {
    return this.applyScoreAction(
      context,
      () => this.scoreEngine.addScoreEvent(this.requireActiveSession(), event),
      {
        id: context.id,
        sessionId: this.requireSession().id,
        timestamp: context.timestamp,
        metadata: context.metadata,
        type: UndoActionType.AddScoreEvent,
        previousEvent: null,
        currentEvent: event,
      },
    )
  }

  addPlayerScore(input: PlayerScoreInput, context: ActionContext): GameSession {
    const session = this.requireActiveSession()
    const currentRound = session.rounds.at(-1)
    if (
      session.template.scoringType === ScoringType.PerRound &&
      !currentRound
    ) {
      throw new SessionEngineError(
        'INVALID_ROUND',
        'Per-round scoring requires a current round.',
      )
    }

    return this.addScore(
      {
        id: input.id,
        playerId: input.playerId,
        roundId:
          session.template.scoringType === ScoringType.PerRound
            ? currentRound?.id
            : undefined,
        type: ScoreEventType.Score,
        points: input.points,
        createdAt: input.createdAt,
      },
      context,
    )
  }

  updateScore(event: ScoreEvent, context: ActionContext): GameSession {
    const session = this.requireActiveSession()
    const previousEvent = session.scoreEvents.find(({ id }) => id === event.id)
    if (!previousEvent) {
      throw new SessionEngineError(
        'INVALID_SCORE_OPERATION',
        `Score event "${event.id}" was not found.`,
      )
    }
    return this.applyScoreAction(
      context,
      () => this.scoreEngine.updateScoreEvent(session, event),
      {
        id: context.id,
        sessionId: session.id,
        timestamp: context.timestamp,
        metadata: context.metadata,
        type: UndoActionType.UpdateScoreEvent,
        previousEvent,
        currentEvent: event,
      },
    )
  }

  deleteScore(eventId: EntityId, context: ActionContext): GameSession {
    const session = this.requireActiveSession()
    const eventIndex = session.scoreEvents.findIndex(({ id }) => id === eventId)
    const previousEvent = session.scoreEvents[eventIndex]
    if (!previousEvent) {
      throw new SessionEngineError(
        'INVALID_SCORE_OPERATION',
        `Score event "${eventId}" was not found.`,
      )
    }
    return this.applyScoreAction(
      context,
      () => this.scoreEngine.removeScoreEvent(session, eventId),
      {
        id: context.id,
        sessionId: session.id,
        timestamp: context.timestamp,
        metadata: context.metadata,
        type: UndoActionType.DeleteScoreEvent,
        previousEvent,
        currentEvent: null,
        eventIndex,
      },
    )
  }

  undoLastAction(): UndoResult {
    const session = this.requireActiveSession()
    try {
      const result = this.undoEngine.undo(session)
      this.currentSession = cloneSession(result.session)
      return {
        ...result,
        session: cloneSession(result.session),
      }
    } catch (error) {
      throw new SessionEngineError(
        'UNDO_FAILED',
        'Unable to undo the latest game action.',
        error,
      )
    }
  }

  canUndo(): boolean {
    return this.undoEngine.canUndo()
  }

  getCurrentStandings(): readonly WinnerStanding[] {
    return this.evaluateWinner(this.requireSession()).standings
  }

  getCurrentRoundScores(): readonly PlayerTotal[] {
    const session = this.requireSession()
    const currentRound = session.rounds.at(-1)
    return currentRound
      ? this.scoreEngine.getRoundScores(session, currentRound.id)
      : []
  }

  getWinner(): WinnerStanding | undefined {
    const session = this.requireSession()
    try {
      return this.winnerEngine.getWinner(session)
    } catch (error) {
      throw new SessionEngineError(
        'WINNER_FAILED',
        'Unable to determine the game winner.',
        error,
      )
    }
  }

  getCurrentRound(): Round | undefined {
    const session = this.requireSession()
    const round = session.rounds.at(-1)
    return round ? { ...round } : undefined
  }

  getCurrentSession(): GameSession | undefined {
    return this.currentSession ? cloneSession(this.currentSession) : undefined
  }

  getSnapshot(): SessionSnapshot | undefined {
    const session = this.getCurrentSession()
    return session
      ? { session, currentRound: session.rounds.at(-1) }
      : undefined
  }

  isGameComplete(): boolean {
    return this.currentSession?.status === GameSessionStatus.Completed
  }

  private applyScoreAction(
    context: ActionContext,
    operation: () => GameSession,
    action: UndoAction,
  ): GameSession {
    if (!isNonEmpty(context.id) || !isNonEmpty(context.timestamp)) {
      throw new SessionEngineError(
        'INVALID_SCORE_OPERATION',
        'Score action ID and timestamp must be non-empty strings.',
      )
    }

    try {
      const updated = operation()
      this.undoEngine.recordAction(updated, action)
      return this.commit(updated)
    } catch (error) {
      throw new SessionEngineError(
        'INVALID_SCORE_OPERATION',
        'Unable to apply score operation.',
        error,
      )
    }
  }

  private evaluateWinner(session: GameSession): WinnerResult {
    try {
      return this.winnerEngine.evaluate(session)
    } catch (error) {
      throw new SessionEngineError(
        'WINNER_FAILED',
        'Unable to calculate standings and winners.',
        error,
      )
    }
  }

  private requireSession(): GameSession {
    if (!this.currentSession) {
      throw new SessionEngineError(
        'MISSING_SESSION',
        'No current game session exists.',
      )
    }
    return this.currentSession
  }

  private requirePlayerSetup(): GameSession {
    const session = this.requireSession()
    if (session.status !== GameSessionStatus.NotStarted) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Players can be changed only before the game starts.',
      )
    }
    return session
  }

  private requireActiveSession(): GameSession {
    const session = this.requireSession()
    if (session.status !== GameSessionStatus.Active) {
      throw new SessionEngineError(
        'INVALID_TRANSITION',
        'Operation requires an active game session.',
      )
    }
    return session
  }

  private requireValidPlayer(player: Player): void {
    if (!isNonEmpty(player.id) || !isNonEmpty(player.name)) {
      throw new SessionEngineError(
        'INVALID_PLAYER',
        'Player ID and name must be non-empty strings.',
      )
    }
  }

  private requirePlayer(session: GameSession, playerId: EntityId): void {
    if (!session.players.some(({ id }) => id === playerId)) {
      throw new SessionEngineError(
        'PLAYER_NOT_FOUND',
        `Player "${playerId}" was not found.`,
      )
    }
  }

  private requireUniquePlayerName(
    session: GameSession,
    name: string,
    ignoredPlayerId?: EntityId,
  ): void {
    const normalizedName = name.trim().toLocaleLowerCase()
    if (
      session.players.some(
        (player) =>
          player.id !== ignoredPlayerId &&
          player.name.trim().toLocaleLowerCase() === normalizedName,
      )
    ) {
      throw new SessionEngineError(
        'DUPLICATE_PLAYER_NAME',
        `Player name "${name.trim()}" is already in use.`,
      )
    }
  }

  private commit(session: GameSession): GameSession {
    this.currentSession = cloneSession(session)
    return cloneSession(session)
  }
}
