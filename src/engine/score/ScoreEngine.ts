import type { EntityId, GameSession, Player, ScoreEvent } from '../../models'
import {
  GameSessionStatus,
  RoundType,
  ScoringType,
  ScoreEventType,
  WinnerRule,
} from '../../models'
import { validateGameTemplate } from '../template/templateValidation'
import { ScoreEngineError } from './ScoreEngineError'
import type {
  PlayerStanding,
  PlayerTotal,
  RoundSummary,
  ScoreCalculation,
} from './types'

type SessionInput = GameSession | null | undefined

interface CalculationMaps {
  readonly playerTotals: Map<EntityId, number>
  readonly roundTotals: Map<EntityId, Map<EntityId, number>>
}

const cloneEvent = (event: ScoreEvent): ScoreEvent => ({ ...event })

export class ScoreEngine {
  addScoreEvent(sessionInput: SessionInput, event: ScoreEvent): GameSession {
    const session = this.requireMutableSession(sessionInput)
    this.requireValidEvent(session, event)
    if (session.scoreEvents.some(({ id }) => id === event.id)) {
      throw new ScoreEngineError(
        'DUPLICATE_EVENT',
        `Score event "${event.id}" already exists.`,
      )
    }

    return {
      ...session,
      scoreEvents: [...session.scoreEvents, cloneEvent(event)],
    }
  }

  updateScoreEvent(sessionInput: SessionInput, event: ScoreEvent): GameSession {
    const session = this.requireMutableSession(sessionInput)
    const eventIndex = session.scoreEvents.findIndex(
      ({ id }) => id === event.id,
    )
    if (eventIndex < 0) {
      throw new ScoreEngineError(
        'EVENT_NOT_FOUND',
        `Score event "${event.id}" was not found.`,
      )
    }
    this.requireValidEvent(session, event)

    return {
      ...session,
      scoreEvents: session.scoreEvents.map((current, index) =>
        index === eventIndex ? cloneEvent(event) : current,
      ),
    }
  }

  removeScoreEvent(sessionInput: SessionInput, eventId: EntityId): GameSession {
    const session = this.requireMutableSession(sessionInput)
    if (!session.scoreEvents.some(({ id }) => id === eventId)) {
      throw new ScoreEngineError(
        'EVENT_NOT_FOUND',
        `Score event "${eventId}" was not found.`,
      )
    }

    return {
      ...session,
      scoreEvents: session.scoreEvents.filter(({ id }) => id !== eventId),
    }
  }

  getPlayerTotal(sessionInput: SessionInput, playerId: EntityId): number {
    const session = this.requireValidSession(sessionInput)
    this.requirePlayer(session, playerId)
    return this.calculateMaps(session).playerTotals.get(playerId) ?? 0
  }

  getAllPlayerTotals(sessionInput: SessionInput): readonly PlayerTotal[] {
    return this.recalculate(sessionInput).playerTotals
  }

  getStandings(sessionInput: SessionInput): readonly PlayerStanding[] {
    return this.recalculate(sessionInput).standings
  }

  getRoundScores(
    sessionInput: SessionInput,
    roundId: EntityId,
  ): readonly PlayerTotal[] {
    const session = this.requireValidSession(sessionInput)
    this.requireRound(session, roundId)
    const maps = this.calculateMaps(session)
    return this.toPlayerTotals(session.players, maps.roundTotals.get(roundId))
  }

  getRoundTotal(sessionInput: SessionInput, roundId: EntityId): number {
    return this.getRoundScores(sessionInput, roundId).reduce(
      (total, player) => total + player.total,
      0,
    )
  }

  getRoundSummaries(sessionInput: SessionInput): readonly RoundSummary[] {
    return this.recalculate(sessionInput).roundSummaries
  }

  getScoreHistory(
    sessionInput: SessionInput,
    playerId?: EntityId,
  ): readonly ScoreEvent[] {
    const session = this.requireValidSession(sessionInput)
    if (playerId !== undefined) this.requirePlayer(session, playerId)

    return session.scoreEvents
      .filter((event) => playerId === undefined || event.playerId === playerId)
      .map(cloneEvent)
  }

  /** Derives every score projection in one traversal of score events. */
  recalculate(sessionInput: SessionInput): ScoreCalculation {
    const session = this.requireValidSession(sessionInput)
    const maps = this.calculateMaps(session)
    const playerTotals = this.toPlayerTotals(session.players, maps.playerTotals)
    const roundSummaries = [...session.rounds]
      .sort((left, right) => left.number - right.number)
      .map((round): RoundSummary => {
        const scores = this.toPlayerTotals(
          session.players,
          maps.roundTotals.get(round.id),
        )
        return {
          roundId: round.id,
          roundNumber: round.number,
          scores,
          total: scores.reduce((sum, player) => sum + player.total, 0),
        }
      })

    return {
      playerTotals,
      standings: this.toStandings(playerTotals, session.template.winnerRule),
      roundSummaries,
      scoreHistory: session.scoreEvents.map(cloneEvent),
    }
  }

  private calculateMaps(session: GameSession): CalculationMaps {
    const playerTotals = new Map<EntityId, number>(
      session.players.map((player) => [player.id, 0] as const),
    )
    const roundTotals = new Map<EntityId, Map<EntityId, number>>(
      session.rounds.map(
        (round) =>
          [
            round.id,
            new Map<EntityId, number>(
              session.players.map((player) => [player.id, 0] as const),
            ),
          ] as const,
      ),
    )

    for (const event of session.scoreEvents) {
      playerTotals.set(
        event.playerId,
        (playerTotals.get(event.playerId) ?? 0) + event.points,
      )
      if (event.roundId !== undefined) {
        const scores = roundTotals.get(event.roundId)
        scores?.set(
          event.playerId,
          (scores.get(event.playerId) ?? 0) + event.points,
        )
      }
    }

    return { playerTotals, roundTotals }
  }

  private toPlayerTotals(
    players: readonly Player[],
    totals: ReadonlyMap<EntityId, number> | undefined,
  ): readonly PlayerTotal[] {
    return players.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      total: totals?.get(player.id) ?? 0,
    }))
  }

  private toStandings(
    totals: readonly PlayerTotal[],
    winnerRule: WinnerRule,
  ): readonly PlayerStanding[] {
    const direction = winnerRule === WinnerRule.HighestScore ? -1 : 1
    const sorted = [...totals].sort(
      (left, right) => direction * (left.total - right.total),
    )
    let previousTotal: number | undefined
    let previousRank = 0

    return sorted.map((player, index) => {
      if (index === 0 || player.total !== previousTotal)
        previousRank = index + 1
      previousTotal = player.total
      return { ...player, rank: previousRank }
    })
  }

  private requireMutableSession(sessionInput: SessionInput): GameSession {
    const session = this.requireValidSession(sessionInput)
    if (session.status !== GameSessionStatus.Active) {
      throw new ScoreEngineError(
        'SESSION_NOT_ACTIVE',
        `Game session "${session.id}" is not active.`,
      )
    }
    return session
  }

  private requireValidSession(sessionInput: SessionInput): GameSession {
    if (!sessionInput) {
      throw new ScoreEngineError(
        'MISSING_SESSION',
        'An active game session is required.',
      )
    }
    if (!validateGameTemplate(sessionInput.template).valid) {
      throw new ScoreEngineError(
        'INVALID_TEMPLATE',
        `Game session "${sessionInput.id}" has an invalid template.`,
      )
    }

    this.requireValidPlayers(sessionInput)
    this.requireValidRounds(sessionInput)
    this.requireValidStoredEvents(sessionInput)
    return sessionInput
  }

  private requireValidPlayers(session: GameSession): void {
    const playerIds = new Set<EntityId>()
    for (const player of session.players) {
      if (!player.id.trim() || playerIds.has(player.id)) {
        throw new ScoreEngineError(
          'INVALID_SESSION',
          'Session player IDs must be non-empty and unique.',
        )
      }
      playerIds.add(player.id)
    }
  }

  private requireValidRounds(session: GameSession): void {
    const roundIds = new Set<EntityId>()
    const roundNumbers = new Set<number>()
    for (const round of session.rounds) {
      const exceedsFixedLimit =
        session.template.roundConfiguration.type === RoundType.Fixed &&
        round.number > session.template.roundConfiguration.totalRounds
      if (
        !round.id.trim() ||
        !Number.isInteger(round.number) ||
        round.number < 1 ||
        exceedsFixedLimit ||
        roundIds.has(round.id) ||
        roundNumbers.has(round.number)
      ) {
        throw new ScoreEngineError(
          'INVALID_ROUND',
          'Session rounds must have unique IDs and valid positive numbers.',
        )
      }
      roundIds.add(round.id)
      roundNumbers.add(round.number)
    }
  }

  private requireValidStoredEvents(session: GameSession): void {
    const eventIds = new Set<EntityId>()
    for (const event of session.scoreEvents) {
      if (eventIds.has(event.id)) {
        throw new ScoreEngineError(
          'INVALID_SESSION',
          `Stored score event ID "${event.id}" is duplicated.`,
        )
      }
      this.requireValidEvent(session, event)
      eventIds.add(event.id)
    }
  }

  private requireValidEvent(session: GameSession, event: ScoreEvent): void {
    if (
      !event.id.trim() ||
      !Number.isFinite(event.points) ||
      !Object.values(ScoreEventType).includes(event.type)
    ) {
      throw new ScoreEngineError(
        'INVALID_EVENT',
        'Score event requires a non-empty ID, finite points, and valid type.',
      )
    }
    this.requirePlayer(session, event.playerId)

    if (
      session.template.scoringType === ScoringType.PerRound &&
      event.roundId === undefined
    ) {
      throw new ScoreEngineError(
        'INVALID_ROUND',
        'Per-round score events require a round ID.',
      )
    }
    if (event.roundId !== undefined) this.requireRound(session, event.roundId)
  }

  private requirePlayer(session: GameSession, playerId: EntityId): Player {
    const player = session.players.find(({ id }) => id === playerId)
    if (!player) {
      throw new ScoreEngineError(
        'PLAYER_NOT_FOUND',
        `Player "${playerId}" does not exist in session "${session.id}".`,
      )
    }
    return player
  }

  private requireRound(session: GameSession, roundId: EntityId): void {
    if (!session.rounds.some(({ id }) => id === roundId)) {
      throw new ScoreEngineError(
        'INVALID_ROUND',
        `Round "${roundId}" does not exist in session "${session.id}".`,
      )
    }
  }
}
