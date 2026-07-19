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
import { createEntityId } from '@/utils/createEntityId'

interface PlayerSetupForm {
  readonly players: { readonly playerId: string; readonly name: string }[]
}

const newPlayer = () => ({ playerId: createEntityId(), name: '' })

export function PlayerSetupPage() {
  const navigate = useNavigate()
  const activeTemplate = useTemplateStore((state) => state.activeTemplate)
  const setupGame = useGameStore((state) => state.setupGame)
  const isLoading = useGameStore((state) => state.isLoading)
  const error = useGameStore((state) => state.error)
  const { control, formState, handleSubmit, register } =
    useForm<PlayerSetupForm>({
      defaultValues: { players: [newPlayer(), newPlayer()] },
    })
  const { append, fields, remove } = useFieldArray({
    control,
    name: 'players',
  })

  if (!activeTemplate) {
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
    const started = await setupGame({
      sessionId: createEntityId(),
      templateId: activeTemplate.id,
      players: players.map(({ playerId, name }) => ({
        id: playerId,
        name: name.trim(),
      })),
      startedAt: new Date().toISOString(),
      initialRoundId: createEntityId(),
    })
    if (started) navigate('/scoring')
  })

  return (
    <AppLayout
      bottomAction={
        <BottomActionBar>
          <SecondaryButton
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
            Start game
          </PrimaryButton>
        </BottomActionBar>
      }
      header={
        <Header
          leading={<BackButton onClick={() => navigate('/games')} />}
          subtitle={activeTemplate.name}
          title="Add players"
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
            <Text c="dimmed">
              Add at least {activeTemplate.minimumPlayers} players. Names must
              be unique.
            </Text>
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
