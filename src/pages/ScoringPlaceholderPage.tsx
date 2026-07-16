import { Stack, Text, Title } from '@mantine/core'
import { ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useGameStore } from '@/app/useStores'
import {
  AppLayout,
  EmptyState,
  Header,
  PageContainer,
  PrimaryButton,
} from '@/components'

export function ScoringPlaceholderPage() {
  const navigate = useNavigate()
  const session = useGameStore((state) => state.session)

  return (
    <AppLayout header={<Header title="Game ready" />}>
      <PageContainer py="xl">
        {session ? (
          <Stack
            align="center"
            gap="lg"
            mih="60dvh"
            justify="center"
            ta="center"
          >
            <ClipboardList aria-hidden size={56} />
            <Stack gap="xs">
              <Title order={2}>{session.template.name}</Title>
              <Text c="dimmed">
                {session.players.map(({ name }) => name).join(' · ')}
              </Text>
              <Text>Scoring screen arrives in the next milestone.</Text>
            </Stack>
          </Stack>
        ) : (
          <EmptyState
            action={
              <PrimaryButton onClick={() => navigate('/games')}>
                Set up a game
              </PrimaryButton>
            }
            description="Choose a game and players first."
            icon={<ClipboardList size={28} />}
            title="No active game"
          />
        )}
      </PageContainer>
    </AppLayout>
  )
}
