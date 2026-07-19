import {
  Alert,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  AlertCircle,
  Gamepad2,
  Home,
  RotateCcw,
  Trophy,
  Users,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useGameStore } from '@/app/useStores'
import {
  AppLayout,
  CardSection,
  EmptyState,
  Header,
  PageContainer,
  PrimaryButton,
  SecondaryButton,
  WinnerBadge,
} from '@/components'
import { GameSessionStatus } from '@/models'
import { createEntityId } from '@/utils/createEntityId'

const formatPoints = (points: number): string =>
  `${points} ${Math.abs(points) === 1 ? 'Point' : 'Points'}`

export function WinnerPage() {
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const session = useGameStore((state) => state.session)
  const winnerResult = useGameStore((state) => state.winnerResult)
  const isLoading = useGameStore((state) => state.isLoading)
  const error = useGameStore((state) => state.error)
  const restartGame = useGameStore((state) => state.restartGame)
  const discardSession = useGameStore((state) => state.discardSession)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (!session || session.status !== GameSessionStatus.Completed) {
    return <Navigate replace to="/" />
  }

  const clearAndNavigate = async (path: string) => {
    if (await discardSession()) navigate(path)
  }

  const playAgain = async () => {
    const timestamp = new Date().toISOString()
    const restarted = await restartGame({
      sessionId: createEntityId(),
      startedAt: timestamp,
      initialRoundId: createEntityId(),
    })
    if (restarted) navigate('/scoring')
  }

  if (!winnerResult || winnerResult.winners.length === 0) {
    return (
      <AppLayout
        header={
          <Header subtitle={session.template.name} title="Game complete" />
        }
      >
        <PageContainer py="xl">
          <EmptyState
            action={
              <PrimaryButton onClick={() => void clearAndNavigate('/')}>
                Return home
              </PrimaryButton>
            }
            description="Final winner data could not be determined."
            icon={<AlertCircle size={28} />}
            title="Results unavailable"
          />
        </PageContainer>
      </AppLayout>
    )
  }

  const winnerLabel = winnerResult.isTie ? 'Winners' : 'Winner'

  return (
    <AppLayout
      header={<Header subtitle={session.template.name} title="Game complete" />}
    >
      <PageContainer className="winner-page" py="xl">
        <Stack gap="xl">
          <Center
            aria-labelledby="winner-heading"
            className="winner-hero"
            component="section"
          >
            <Stack align="center" gap="sm" ta="center">
              <ThemeIcon
                aria-hidden
                className="winner-trophy"
                color="yellow"
                radius="xl"
                size={80}
                variant="light"
              >
                <Trophy size={44} />
              </ThemeIcon>
              <WinnerBadge label={winnerLabel} />
              <Stack gap={2}>
                {winnerResult.winners.map((winner, index) => (
                  <Title
                    id={index === 0 ? 'winner-heading' : undefined}
                    key={winner.playerId}
                    order={2}
                    ref={index === 0 ? headingRef : undefined}
                    tabIndex={index === 0 ? -1 : undefined}
                  >
                    {winner.playerName}
                  </Title>
                ))}
              </Stack>
              <Text className="winning-score" fw={800} size="xl">
                {formatPoints(winnerResult.winners[0]!.total)}
              </Text>
            </Stack>
          </Center>

          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Unable to continue"
            >
              {error}
            </Alert>
          ) : null}

          <CardSection labelledBy="final-standings-heading">
            <Title id="final-standings-heading" order={2} size="h3">
              Final standings
            </Title>
            <Stack
              aria-label="Final standings"
              component="ol"
              className="unstyled-list"
              gap="xs"
            >
              {winnerResult.standings.map((standing) => (
                <li key={standing.playerId}>
                  <Group
                    aria-label={`Rank ${standing.rank}, ${standing.playerName}, ${formatPoints(standing.total).toLocaleLowerCase()}${standing.isWinner ? ', winner' : ''}`}
                    className="final-standing"
                    data-winner={standing.isWinner || undefined}
                    justify="space-between"
                    wrap="nowrap"
                  >
                    <Group gap="md" wrap="nowrap">
                      <Text
                        aria-hidden
                        className="standing-rank"
                        fw={800}
                        size="lg"
                      >
                        {standing.rank}
                      </Text>
                      <Stack gap={0}>
                        <Text fw={700} size="lg">
                          {standing.playerName}
                        </Text>
                        {standing.isWinner ? (
                          <Text c="dimmed" size="sm">
                            {winnerLabel}
                          </Text>
                        ) : null}
                      </Stack>
                    </Group>
                    <Text className="score-value" fw={800} size="xl">
                      {standing.total}
                    </Text>
                  </Group>
                </li>
              ))}
            </Stack>
          </CardSection>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <PrimaryButton
              disabled={isLoading}
              leftSection={<RotateCcw aria-hidden size={20} />}
              onClick={() => void playAgain()}
            >
              Play again
            </PrimaryButton>
            <SecondaryButton
              disabled={isLoading}
              leftSection={<Users aria-hidden size={20} />}
              onClick={() => navigate('/players')}
            >
              Edit players
            </SecondaryButton>
            <SecondaryButton
              disabled={isLoading}
              leftSection={<Gamepad2 aria-hidden size={20} />}
              onClick={() => void clearAndNavigate('/games')}
            >
              Choose another game
            </SecondaryButton>
            <SecondaryButton
              disabled={isLoading}
              leftSection={<Home aria-hidden size={20} />}
              onClick={() => void clearAndNavigate('/')}
            >
              Return home
            </SecondaryButton>
          </SimpleGrid>
        </Stack>
      </PageContainer>
    </AppLayout>
  )
}
