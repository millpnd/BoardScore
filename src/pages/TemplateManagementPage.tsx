import {
  Alert,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { AlertCircle, Blocks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useGameStore, useTemplateStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  ConfirmDialog,
  EmptyState,
  Header,
  LoadingIndicator,
  PageContainer,
  PrimaryButton,
  SecondaryButton,
  Toolbar,
} from '@/components'
import type { GameTemplate } from '@/models'
import { GameSessionStatus, RoundType, ScoringType, WinnerRule } from '@/models'

const scoringLabels = {
  [ScoringType.RunningTotal]: 'Running Total',
  [ScoringType.PerRound]: 'Per Round',
} satisfies Record<ScoringType, string>

const winnerLabels = {
  [WinnerRule.HighestScore]: 'Highest Score Wins',
  [WinnerRule.LowestScore]: 'Lowest Score Wins',
} satisfies Record<WinnerRule, string>

const roundSummary = (template: GameTemplate): string =>
  template.roundConfiguration.type === RoundType.Fixed
    ? `${template.roundConfiguration.totalRounds} rounds`
    : 'Unlimited rounds'

const playerSummary = (template: GameTemplate): string =>
  template.maximumPlayers === null
    ? `${template.minimumPlayers}+ players`
    : `${template.minimumPlayers}-${template.maximumPlayers} players`

const getRouteMessage = (state: unknown): string | null => {
  if (typeof state !== 'object' || state === null || !('message' in state)) {
    return null
  }

  const { message } = state as { readonly message?: unknown }
  return typeof message === 'string' ? message : null
}

export function TemplateManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const customTemplates = useTemplateStore((state) => state.customTemplates)
  const isLoading = useTemplateStore((state) => state.isLoading)
  const error = useTemplateStore((state) => state.error)
  const loadTemplates = useTemplateStore((state) => state.loadTemplates)
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate)
  const session = useGameStore((state) => state.session)
  const recoverableSession = useGameStore((state) => state.recoverableSession)
  const checkForRecoverableSession = useGameStore(
    (state) => state.checkForRecoverableSession,
  )
  const [deleteTarget, setDeleteTarget] = useState<GameTemplate>()
  const [hasLoaded, setHasLoaded] = useState(false)
  const [notice, setNotice] = useState(() => getRouteMessage(location.state))

  useEffect(() => {
    let active = true
    void Promise.all([loadTemplates(), checkForRecoverableSession()]).finally(
      () => {
        if (active) setHasLoaded(true)
      },
    )
    return () => {
      active = false
    }
  }, [checkForRecoverableSession, loadTemplates])

  const protectedSession =
    session && session.status !== GameSessionStatus.Completed
      ? session
      : recoverableSession
  const protectedTemplateId =
    protectedSession && protectedSession.status !== GameSessionStatus.Completed
      ? protectedSession?.template.id
      : null

  const sortedTemplates = useMemo(
    () =>
      [...customTemplates].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [customTemplates],
  )

  const confirmDelete = async () => {
    if (!deleteTarget) return

    const deleted = await deleteTemplate(deleteTarget.id)
    if (deleted) {
      setNotice('Custom game deleted.')
      setDeleteTarget(undefined)
    }
  }

  return (
    <AppLayout
      header={
        <Header
          actions={
            <PrimaryButton
              leftSection={<Plus aria-hidden size={20} />}
              onClick={() => navigate('/templates/new')}
            >
              Create
            </PrimaryButton>
          }
          leading={<BackButton onClick={() => navigate('/')} />}
          subtitle="Create and maintain your own game templates"
          title="Custom games"
        />
      }
    >
      <PageContainer py="xl">
        <Stack gap="xl">
          {notice ? (
            <Alert color="green" title="Template updated">
              {notice}
            </Alert>
          ) : null}
          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Template unavailable"
            >
              {error}
            </Alert>
          ) : null}

          {!hasLoaded && isLoading ? (
            <LoadingIndicator label="Loading custom games" />
          ) : sortedTemplates.length === 0 ? (
            <EmptyState
              action={
                <PrimaryButton
                  leftSection={<Plus aria-hidden size={20} />}
                  onClick={() => navigate('/templates/new')}
                >
                  Create Custom Game
                </PrimaryButton>
              }
              description="Create your own scoring template for games that are not included in BoardScore."
              icon={<Blocks size={28} />}
              title="No Custom Games Yet"
            />
          ) : (
            <SimpleGrid
              aria-label="Custom templates"
              className="unstyled-list"
              cols={{ base: 1, sm: 2 }}
              component="ul"
              spacing="md"
            >
              {sortedTemplates.map((template) => {
                const usedByActiveSession = template.id === protectedTemplateId
                return (
                  <Paper component="li" key={template.id} p="lg" withBorder>
                    <Stack gap="md">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Title order={2} size="h3">
                            {template.name}
                          </Title>
                          <Badge color="tableGreen" variant="light">
                            Custom
                          </Badge>
                        </Group>
                        <Text c="dimmed" lineClamp={2}>
                          {template.description}
                        </Text>
                      </Stack>

                      <Stack gap={4}>
                        <Text size="sm">
                          {scoringLabels[template.scoringType]}
                        </Text>
                        <Text size="sm">
                          {winnerLabels[template.winnerRule]}
                        </Text>
                        <Text size="sm">{roundSummary(template)}</Text>
                        <Text size="sm">{playerSummary(template)}</Text>
                        {usedByActiveSession ? (
                          <Text c="dimmed" size="sm">
                            Finish or discard the active game before deleting.
                          </Text>
                        ) : null}
                      </Stack>

                      <Toolbar ariaLabel={`${template.name} actions`}>
                        <SecondaryButton
                          leftSection={<Pencil aria-hidden size={20} />}
                          onClick={() =>
                            navigate(`/templates/${template.id}/edit`)
                          }
                        >
                          Edit
                        </SecondaryButton>
                        <SecondaryButton
                          color="red"
                          disabled={usedByActiveSession}
                          leftSection={<Trash2 aria-hidden size={20} />}
                          onClick={() => setDeleteTarget(template)}
                        >
                          Delete
                        </SecondaryButton>
                      </Toolbar>
                    </Stack>
                  </Paper>
                )
              })}
            </SimpleGrid>
          )}
        </Stack>
      </PageContainer>

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        message="This will permanently remove this custom game template from this device."
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => void confirmDelete()}
        opened={deleteTarget !== undefined}
        title="Delete Custom Game?"
      />
    </AppLayout>
  )
}
