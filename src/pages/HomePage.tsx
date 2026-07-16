import { Alert, Center, Group, Stack, Text } from '@mantine/core'
import { AlertCircle, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import {
  AppLayout,
  BrandMark,
  ColorSchemeToggle,
  Footer,
  PageContainer,
  PrimaryButton,
  ResumeSessionDialog,
} from '@/components'
import { useGameStore } from '@/app/useStores'

export function HomePage() {
  const navigate = useNavigate()
  const recoverableSession = useGameStore((state) => state.recoverableSession)
  const error = useGameStore((state) => state.error)
  const checkForRecoverableSession = useGameStore(
    (state) => state.checkForRecoverableSession,
  )
  const resumeSession = useGameStore((state) => state.resumeSession)
  const discardSession = useGameStore((state) => state.discardSession)

  useEffect(() => {
    void checkForRecoverableSession()
  }, [checkForRecoverableSession])

  const resume = async () => {
    if (await resumeSession()) navigate('/scoring')
  }

  return (
    <AppLayout footer={<Footer />}>
      <PageContainer className="home-page" py="xl">
        <Group justify="flex-end">
          <ColorSchemeToggle />
        </Group>
        <Center mih="70dvh">
          <Stack align="center" gap="xl" maw={520} ta="center" w="100%">
            <BrandMark />
            <Stack gap="xs">
              <Text fw={700} size="xl">
                Score games, not paper.
              </Text>
              <Text c="dimmed" size="lg">
                Pick a game, add players, and start scoring in seconds.
              </Text>
            </Stack>
            {error ? (
              <Alert
                color="red"
                icon={<AlertCircle aria-hidden size={20} />}
                title="Unable to continue"
                w="100%"
              >
                {error}
              </Alert>
            ) : null}
            <Stack gap="sm" w="100%">
              <PrimaryButton
                fullWidth
                leftSection={<Plus aria-hidden size={22} />}
                onClick={() => navigate('/games')}
              >
                New game
              </PrimaryButton>
            </Stack>
          </Stack>
        </Center>
      </PageContainer>

      {recoverableSession ? (
        <ResumeSessionDialog
          detail={
            recoverableSession.rounds.at(-1)
              ? `Round ${recoverableSession.rounds.at(-1)!.number}`
              : 'Game not started'
          }
          gameName={recoverableSession.template.name}
          onDiscard={() => void discardSession()}
          onResume={() => void resume()}
          opened
          players={recoverableSession.players.map(({ name }) => name)}
        />
      ) : null}
    </AppLayout>
  )
}
