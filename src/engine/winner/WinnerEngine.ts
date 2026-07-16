import type { GameSession, GameTemplate } from '../../models'
import { WinnerRule } from '../../models'
import { ScoreEngine, ScoreEngineError, type PlayerStanding } from '../score'
import {
  WinnerEngineError,
  type WinnerEngineErrorCode,
} from './WinnerEngineError'
import type { WinnerResult, WinnerStanding } from './types'

type SessionInput = GameSession | null | undefined

export interface StandingsProvider {
  getStandings(session: GameSession): readonly PlayerStanding[]
}

export class WinnerEngine {
  constructor(
    private readonly standingsProvider: StandingsProvider = new ScoreEngine(),
  ) {}

  evaluate(sessionInput: SessionInput): WinnerResult {
    const session = this.requireSession(sessionInput)
    this.requireSupportedRule(session.template.winnerRule)
    const scoreStandings = this.getScoreStandings(session)
    this.requireValidScoreOutput(session, scoreStandings)

    const hasScores = session.scoreEvents.length > 0
    const standings = scoreStandings.map((standing): WinnerStanding => ({
      ...standing,
      isWinner: hasScores && standing.rank === 1,
    }))
    const winners = standings.filter(({ isWinner }) => isWinner)

    return {
      standings,
      winners,
      isTie: winners.length > 1,
    }
  }

  getStandings(sessionInput: SessionInput): readonly WinnerStanding[] {
    return this.evaluate(sessionInput).standings
  }

  /** Returns one winner only when the result is not tied. */
  getWinner(sessionInput: SessionInput): WinnerStanding | undefined {
    const result = this.evaluate(sessionInput)
    return result.winners.length === 1 ? result.winners[0] : undefined
  }

  getWinners(sessionInput: SessionInput): readonly WinnerStanding[] {
    return this.evaluate(sessionInput).winners
  }

  isTie(sessionInput: SessionInput): boolean {
    return this.evaluate(sessionInput).isTie
  }

  private requireSession(sessionInput: SessionInput): GameSession {
    if (!sessionInput) {
      throw new WinnerEngineError(
        'MISSING_SESSION',
        'A game session is required to determine winners.',
      )
    }

    const template = (sessionInput as { readonly template?: GameTemplate })
      .template
    if (!template) {
      throw new WinnerEngineError(
        'MISSING_TEMPLATE',
        `Game session "${sessionInput.id}" has no template.`,
      )
    }
    return sessionInput
  }

  private requireSupportedRule(rule: WinnerRule): void {
    switch (rule) {
      case WinnerRule.HighestScore:
      case WinnerRule.LowestScore:
        return
      default:
        throw new WinnerEngineError(
          'UNSUPPORTED_WINNER_RULE',
          `Winner rule "${String(rule)}" is not supported.`,
        )
    }
  }

  private getScoreStandings(session: GameSession): readonly PlayerStanding[] {
    try {
      return this.standingsProvider.getStandings(session)
    } catch (error) {
      if (!(error instanceof ScoreEngineError)) throw error

      const code: WinnerEngineErrorCode =
        error.code === 'INVALID_TEMPLATE'
          ? 'INVALID_TEMPLATE'
          : error.code === 'MISSING_SESSION'
            ? 'MISSING_SESSION'
            : 'INVALID_SESSION'
      throw new WinnerEngineError(
        code,
        `Cannot determine winners: ${error.message}`,
        error,
      )
    }
  }

  private requireValidScoreOutput(
    session: GameSession,
    standings: readonly PlayerStanding[],
  ): void {
    const sessionPlayers = new Map(
      session.players.map((player) => [player.id, player] as const),
    )
    const seen = new Set<string>()
    const invalidStanding = standings.some((standing, index) => {
      const player = sessionPlayers.get(standing.playerId)
      const previousRank = standings[index - 1]?.rank
      const invalidRankOrder =
        index === 0 ? standing.rank !== 1 : standing.rank < (previousRank ?? 1)
      const invalid =
        !player ||
        player.name !== standing.playerName ||
        seen.has(standing.playerId) ||
        !Number.isFinite(standing.total) ||
        !Number.isInteger(standing.rank) ||
        standing.rank < 1 ||
        invalidRankOrder
      seen.add(standing.playerId)
      return invalid
    })

    if (invalidStanding || seen.size !== sessionPlayers.size) {
      throw new WinnerEngineError(
        'INVALID_SCORE_OUTPUT',
        'ScoreEngine returned incomplete or invalid player standings.',
      )
    }
  }
}
