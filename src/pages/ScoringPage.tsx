import { Alert, Badge, Grid, Group, Stack, Text, Title } from '@mantine/core'
import {
  AlertCircle,
  Ellipsis,
  RotateCcw,
  StepForward,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useGameStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  CardSection,
  ConfirmDialog,
  EmptyState,
  Header,
  IconButton,
  NumericKeypad,
  PageContainer,
  PrimaryButton,
  RoundIndicator,
  ScoringPlayerCard,
  SecondaryButton,
  Toolbar,
} from '@/components'
import { GameSessionStatus, RoundType, ScoringType } from '@/models'
import { createEntityId } from '@/utils/createEntityId'

export function ScoringPage() {
  const navigate = useNavigate()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>()
  const [scoreInput, setScoreInput] = useState('')
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false)
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

  useEffect(() => {
    const confirmRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', confirmRefresh)
    return () => window.removeEventListener('beforeunload', confirmRefresh)
  }, [])

  const roundScoresByPlayer = useMemo(
    () =>
      new Map(
        currentRoundScores.map(({ playerId, total }) => [playerId, total]),
      ),
    [currentRoundScores],
  )

  if (
    !session ||
    session.status !== GameSessionStatus.Active ||
    !session.template.id ||
    session.players.length === 0
  ) {
    return <Navigate replace to="/" />
  }

  const perRound = session.template.scoringType === ScoringType.PerRound
  const selectedPlayer = session.players.find(
    ({ id }) => id === selectedPlayerId,
  )
  const fixedRoundTotal =
    session.template.roundConfiguration.type === RoundType.Fixed
      ? session.template.roundConfiguration.totalRounds
      : undefined

  const submitScore = async () => {
    if (!selectedPlayer || scoreInput === '' || scoreInput === '-') return
    const timestamp = new Date().toISOString()
    const recorded = await recordScore({
      eventId: createEntityId(),
      actionId: createEntityId(),
      playerId: selectedPlayer.id,
      points: Number(scoreInput),
      timestamp,
    })
    if (recorded) setScoreInput('')
  }

  const advanceRound = async () => {
    await nextRound({
      id: createEntityId(),
      startedAt: new Date().toISOString(),
    })
    setScoreInput('')
  }

  return (
    <AppLayout
      header={
        <Header
          actions={
            <IconButton disabled label="More options">
              <Ellipsis aria-hidden size={22} />
            </IconButton>
          }
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
                onClick={() => void undoLastAction()}
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
                          setSelectedPlayerId(standing.playerId)
                          setScoreInput('')
                        }}
                        rank={standing.rank}
                        roundScore={
                          perRound
                            ? (roundScoresByPlayer.get(standing.playerId) ?? 0)
                            : undefined
                        }
                        selected={selectedPlayerId === standing.playerId}
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
    </AppLayout>
  )
}
