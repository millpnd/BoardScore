import { Alert, Avatar, Stack, Text, Title } from '@mantine/core'
import { AlertCircle, Plus, Trash2, Users } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { useGameStore, useTemplateStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  BottomActionBar,
  EmptyState,
  Header,
  IconButton,
  PageContainer,
  PlayerCard,
  PlayerList,
  PlayerListItem,
  PlayerNameInput,
  PrimaryButton,
  SecondaryButton,
} from '@/components'
import { GameSessionStatus } from '@/models'
import { createEntityId } from '@/utils/createEntityId'

interface PlayerSetupForm {
  readonly players: { readonly playerId: string; readonly name: string }[]
}

const newPlayer = () => ({ playerId: createEntityId(), name: '' })

export function PlayerSetupPage() {
  const navigate = useNavigate()
  const activeTemplate = useTemplateStore((state) => state.activeTemplate)
  const session = useGameStore((state) => state.session)
  const setupGame = useGameStore((state) => state.setupGame)
  const restartGame = useGameStore((state) => state.restartGame)
  const isLoading = useGameStore((state) => state.isLoading)
  const error = useGameStore((state) => state.error)
  const editingCompletedGame = session?.status === GameSessionStatus.Completed
  const template = editingCompletedGame ? session.template : activeTemplate
  const playerLimitLabel = template?.maximumPlayers
    ? `Add ${template.minimumPlayers}-${template.maximumPlayers} players.`
    : `Add at least ${template?.minimumPlayers ?? 2} players.`
  const { control, formState, handleSubmit, register } =
    useForm<PlayerSetupForm>({
      defaultValues: {
        players: editingCompletedGame
          ? session.players.map(({ id, name }) => ({ playerId: id, name }))
          : [newPlayer(), newPlayer()],
      },
    })
  const { append, fields, remove } = useFieldArray({
    control,
    name: 'players',
  })
  const canAddPlayer =
    template?.maximumPlayers === null ||
    template === undefined ||
    fields.length < template.maximumPlayers

  if (!template) {
    return (
      <AppLayout
        header={
          <Header
            leading={<BackButton onClick={() => navigate('/games')} />}
            title="Add players"
          />
        }
      >
        <PageContainer py="xl">
          <EmptyState
            action={
              <PrimaryButton onClick={() => navigate('/games')}>
                Choose a game
              </PrimaryButton>
            }
            description="Select a template before adding players."
            icon={<Users size={28} />}
            title="No game selected"
          />
        </PageContainer>
      </AppLayout>
    )
  }

  const submit = handleSubmit(async ({ players }) => {
    const timestamp = new Date().toISOString()
    const roster = players.map(({ playerId, name }) => ({
      id: playerId,
      name: name.trim(),
    }))
    const started = editingCompletedGame
      ? await restartGame({
          sessionId: createEntityId(),
          players: roster,
          startedAt: timestamp,
          initialRoundId: createEntityId(),
        })
      : await setupGame({
          sessionId: createEntityId(),
          templateId: template.id,
          players: roster,
          startedAt: timestamp,
          initialRoundId: createEntityId(),
        })
    if (started) navigate('/scoring')
  })

  return (
    <AppLayout
      bottomAction={
        <BottomActionBar>
          <SecondaryButton
            disabled={!canAddPlayer}
            leftSection={<Plus aria-hidden size={20} />}
            onClick={() => append(newPlayer())}
            type="button"
          >
            Add player
          </SecondaryButton>
          <PrimaryButton
            form="player-setup-form"
            loading={isLoading}
            type="submit"
          >
            {editingCompletedGame ? 'Start new game' : 'Start game'}
          </PrimaryButton>
        </BottomActionBar>
      }
      header={
        <Header
          leading={
            <BackButton
              onClick={() =>
                navigate(editingCompletedGame ? '/winner' : '/games')
              }
            />
          }
          subtitle={template.name}
          title={editingCompletedGame ? 'Edit players' : 'Add players'}
        />
      }
    >
      <PageContainer py="xl">
        <Stack
          component="form"
          gap="lg"
          id="player-setup-form"
          onSubmit={(event) => void submit(event)}
        >
          <Stack gap={4}>
            <Title order={2}>Who is playing?</Title>
            <Text c="dimmed">{playerLimitLabel} Names must be unique.</Text>
          </Stack>

          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Check the players"
            >
              {error}
            </Alert>
          ) : null}

          <PlayerList ariaLabel="Players">
            {fields.map((field, index) => (
              <PlayerListItem key={field.id}>
                <PlayerCard
                  action={
                    <IconButton
                      label={`Remove player ${index + 1}`}
                      onClick={() => remove(index)}
                      type="button"
                    >
                      <Trash2 aria-hidden size={20} />
                    </IconButton>
                  }
                  leading={<Avatar color="boardBlue">{index + 1}</Avatar>}
                  name={`Player ${index + 1}`}
                  details={
                    <PlayerNameInput
                      aria-label={`Player ${index + 1} name`}
                      autoFocus={index === 0}
                      error={formState.errors.players?.[index]?.name?.message}
                      label=""
                      placeholder="Enter name"
                      {...register(`players.${index}.name`, {
                        required: 'Player name is required.',
                        validate: (name) =>
                          name.trim().length > 0 || 'Player name is required.',
                      })}
                    />
                  }
                />
              </PlayerListItem>
            ))}
          </PlayerList>
        </Stack>
      </PageContainer>
    </AppLayout>
  )
}
