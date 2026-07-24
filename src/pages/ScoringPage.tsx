import { Alert, Badge, Grid, Group, Stack, Text, Title } from '@mantine/core'
import {
  AlertCircle,
  Flag,
  RotateCcw,
  StepForward,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useGameStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  CardSection,
  ConfirmDialog,
  EmptyState,
  Header,
  NumericKeypad,
  PageContainer,
  PrimaryButton,
  RoundIndicator,
  ScoringPlayerCard,
  SecondaryButton,
  Toolbar,
} from '@/components'
import type { EntityId, GameSession, Round } from '@/models'
import { GameSessionStatus, RoundType, ScoringType } from '@/models'
import { createEntityId } from '@/utils/createEntityId'

const automaticRoundAdvanceMetadata = {
  automaticScoreEntryAdvance: true,
} as const

const getSubmittedPlayerIds = (
  session: GameSession,
  currentRound: Round | undefined,
  perRound: boolean,
): ReadonlySet<EntityId> => {
  if (!currentRound) return new Set()

  return new Set(
    session.scoreEvents
      .filter((event) =>
        perRound
          ? event.roundId === currentRound.id
          : event.roundId === undefined &&
            event.createdAt >= currentRound.startedAt &&
            (currentRound.completedAt === undefined ||
              event.createdAt < currentRound.completedAt),
      )
      .map((event) => event.playerId),
  )
}

const getNextEligiblePlayerId = (
  playerIds: readonly EntityId[],
  submittedPlayerIds: ReadonlySet<EntityId>,
  currentPlayerId: EntityId,
): EntityId | undefined => {
  const currentIndex = playerIds.indexOf(currentPlayerId)
  for (let offset = 1; offset <= playerIds.length; offset += 1) {
    const playerId = playerIds[(currentIndex + offset) % playerIds.length]
    if (playerId && !submittedPlayerIds.has(playerId)) return playerId
  }
  return undefined
}

export function ScoringPage() {
  const navigate = useNavigate()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>()
  const [scoreInput, setScoreInput] = useState('')
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false)
  const [finishConfirmationOpen, setFinishConfirmationOpen] = useState(false)
  const scoreInputRef = useRef<HTMLInputElement>(null)
  const submissionInFlight = useRef(false)
  const session = useGameStore((state) => state.session)
  const currentRound = useGameStore((state) => state.currentRound)
  const standings = useGameStore((state) => state.currentStandings)
  const currentRoundScores = useGameStore((state) => state.currentRoundScores)
  const canUndo = useGameStore((state) => state.canUndo)
  const isLoading = useGameStore((state) => state.isLoading)
  const error = useGameStore((state) => state.error)
  const recordScore = useGameStore((state) => state.recordScore)
  const nextRound = useGameStore((state) => state.nextRound)
  const undoLastAction = useGameStore((state) => state.undoLastAction)
  const endGame = useGameStore((state) => state.endGame)

  useEffect(() => {
    const confirmRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', confirmRefresh)
    return () => window.removeEventListener('beforeunload', confirmRefresh)
  }, [])

  const focusScoreInput = useCallback(() => {
    window.setTimeout(() => scoreInputRef.current?.focus(), 0)
  }, [])

  const roundScoresByPlayer = useMemo(
    () =>
      new Map(
        currentRoundScores.map(({ playerId, total }) => [playerId, total]),
      ),
    [currentRoundScores],
  )

  const perRound = session?.template.scoringType === ScoringType.PerRound
  const submittedPlayerIds = useMemo(
    () =>
      session
        ? getSubmittedPlayerIds(session, currentRound, perRound)
        : new Set<EntityId>(),
    [currentRound, perRound, session],
  )
  const eligiblePlayers = useMemo(
    () =>
      session?.players.filter(({ id }) => !submittedPlayerIds.has(id)) ?? [],
    [session?.players, submittedPlayerIds],
  )
  const activePlayerId =
    selectedPlayerId &&
    eligiblePlayers.some(({ id }) => id === selectedPlayerId)
      ? selectedPlayerId
      : eligiblePlayers[0]?.id
  const selectedPlayer = session?.players.find(
    ({ id }) => id === activePlayerId,
  )
  const fixedRoundTotal =
    session?.template.roundConfiguration.type === RoundType.Fixed
      ? session.template.roundConfiguration.totalRounds
      : undefined
  const canStartAnotherRound =
    session !== undefined &&
    currentRound !== undefined &&
    (session.template.roundConfiguration.type === RoundType.Unlimited ||
      currentRound.number < session.template.roundConfiguration.totalRounds)

  useEffect(() => {
    if (activePlayerId !== selectedPlayerId) {
      setSelectedPlayerId(activePlayerId)
      setScoreInput('')
    }
  }, [activePlayerId, selectedPlayerId])

  useEffect(() => {
    if (activePlayerId && !isLoading && !(perRound && !currentRound)) {
      focusScoreInput()
    } else if (!activePlayerId) {
      scoreInputRef.current?.blur()
    }
  }, [activePlayerId, currentRound, focusScoreInput, isLoading, perRound])

  if (
    !session ||
    session.status !== GameSessionStatus.Active ||
    !session.template.id ||
    session.players.length === 0
  ) {
    return <Navigate replace to="/" />
  }

  const submitScore = async () => {
    if (
      submissionInFlight.current ||
      !selectedPlayer ||
      submittedPlayerIds.has(selectedPlayer.id) ||
      scoreInput === '' ||
      scoreInput === '-'
    ) {
      return
    }

    submissionInFlight.current = true
    const submittedAfterScore = new Set(submittedPlayerIds)
    submittedAfterScore.add(selectedPlayer.id)
    const nextPlayerId = getNextEligiblePlayerId(
      session.players.map(({ id }) => id),
      submittedAfterScore,
      selectedPlayer.id,
    )
    const timestamp = new Date().toISOString()
    try {
      const recorded = await recordScore({
        eventId: createEntityId(),
        actionId: createEntityId(),
        playerId: selectedPlayer.id,
        points: Number(scoreInput),
        timestamp,
      })
      if (!recorded) return

      setScoreInput('')
      if (nextPlayerId) {
        setSelectedPlayerId(nextPlayerId)
        focusScoreInput()
        return
      }

      if (canStartAnotherRound) {
        const advanced = await nextRound({
          id: createEntityId(),
          startedAt: new Date().toISOString(),
          metadata: automaticRoundAdvanceMetadata,
        })
        if (advanced) {
          focusScoreInput()
          return
        }
      }

      setSelectedPlayerId(undefined)
      scoreInputRef.current?.blur()
    } finally {
      submissionInFlight.current = false
    }
  }

  const advanceRound = async () => {
    await nextRound({
      id: createEntityId(),
      startedAt: new Date().toISOString(),
    })
    setScoreInput('')
  }

  const undoScore = async () => {
    const restoredPlayerId = session.scoreEvents.at(-1)?.playerId
    const undone = await undoLastAction()
    if (undone) {
      setScoreInput('')
      setSelectedPlayerId(restoredPlayerId)
    }
  }

  const finishGame = async () => {
    const finished = await endGame(new Date().toISOString())
    setFinishConfirmationOpen(false)
    if (finished) navigate('/winner')
  }

  return (
    <AppLayout
      header={
        <Header
          leading={
            <BackButton
              label="Leave game"
              onClick={() => setLeaveConfirmationOpen(true)}
            />
          }
          subtitle={`${currentRound ? `Round ${currentRound.number}` : 'No round'} · ${session.players.length} players`}
          title={session.template.name}
        />
      }
    >
      <PageContainer className="scoring-page" py="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            {currentRound ? (
              <RoundIndicator
                current={currentRound.number}
                total={fixedRoundTotal}
              />
            ) : (
              <Badge size="lg" variant="outline">
                Round not started
              </Badge>
            )}
            <Toolbar ariaLabel="Game controls">
              <SecondaryButton
                disabled={!canUndo || isLoading}
                leftSection={<RotateCcw aria-hidden size={20} />}
                onClick={() => void undoScore()}
              >
                Undo
              </SecondaryButton>
              <PrimaryButton
                disabled={isLoading}
                leftSection={<StepForward aria-hidden size={20} />}
                onClick={() => void advanceRound()}
              >
                Next round
              </PrimaryButton>
              <SecondaryButton
                disabled={isLoading}
                leftSection={<Flag aria-hidden size={20} />}
                onClick={() => setFinishConfirmationOpen(true)}
              >
                Finish game
              </SecondaryButton>
            </Toolbar>
          </Group>

          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Score not saved"
            >
              {error}
            </Alert>
          ) : null}

          <Grid align="start" gap="lg">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <CardSection labelledBy="standings-title">
                <Stack gap={2}>
                  <Title id="standings-title" order={2} size="h3">
                    Standings
                  </Title>
                  <Text c="dimmed" size="sm">
                    Tap a player to enter their score.
                  </Text>
                </Stack>
                <Stack
                  aria-label="Player standings"
                  component="ol"
                  className="unstyled-list"
                  gap="sm"
                >
                  {standings.map((standing) => (
                    <li key={standing.playerId}>
                      <ScoringPlayerCard
                        isLeader={standing.isWinner}
                        name={standing.playerName}
                        onSelect={() => {
                          if (!submittedPlayerIds.has(standing.playerId)) {
                            setSelectedPlayerId(standing.playerId)
                            setScoreInput('')
                            focusScoreInput()
                          }
                        }}
                        rank={standing.rank}
                        roundScore={
                          perRound
                            ? (roundScoresByPlayer.get(standing.playerId) ?? 0)
                            : undefined
                        }
                        selected={activePlayerId === standing.playerId}
                        total={standing.total}
                      />
                    </li>
                  ))}
                </Stack>
              </CardSection>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 5 }}>
              {selectedPlayer ? (
                <NumericKeypad
                  disabled={isLoading || (perRound && !currentRound)}
                  label={`Score for ${selectedPlayer.name}`}
                  onChange={setScoreInput}
                  onSubmit={() => void submitScore()}
                  ref={scoreInputRef}
                  value={scoreInput}
                />
              ) : (
                <CardSection>
                  <EmptyState
                    description="Their keypad will open here."
                    icon={<UserRound size={28} />}
                    title="Select a player"
                  />
                </CardSection>
              )}
            </Grid.Col>
          </Grid>
        </Stack>
      </PageContainer>

      <ConfirmDialog
        cancelLabel="Stay"
        confirmLabel="Leave"
        message="Progress has already been saved. You can resume this game later."
        onCancel={() => setLeaveConfirmationOpen(false)}
        onConfirm={() => navigate('/')}
        opened={leaveConfirmationOpen}
        title="Leave game?"
      />
      <ConfirmDialog
        confirmLabel="Finish game"
        message="Are you sure you want to finish this game?"
        onCancel={() => setFinishConfirmationOpen(false)}
        onConfirm={() => void finishGame()}
        opened={finishConfirmationOpen}
        title="Finish game?"
      />
    </AppLayout>
  )
}
