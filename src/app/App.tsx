import {
  Avatar,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Dice5, Plus, Settings, Sparkles, Trash2, Users } from 'lucide-react'
import { useState } from 'react'

import {
  AppLayout,
  BackButton,
  BottomActionBar,
  CardSection,
  ColorSchemeToggle,
  ConfirmDialog,
  EmptyState,
  Footer,
  GameCard,
  GameList,
  GameListItem,
  Header,
  IconButton,
  LoadingIndicator,
  NumberInput,
  NumericKeypad,
  PageContainer,
  PlayerCard,
  PlayerList,
  PlayerListItem,
  PlayerNameInput,
  PrimaryButton,
  ResumeSessionDialog,
  RoundIndicator,
  ScoreCard,
  SearchInput,
  SecondaryButton,
  Toolbar,
  WinnerBadge,
} from '@/components'

export function App() {
  const [score, setScore] = useState('42')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)

  return (
    <AppLayout
      bottomAction={
        <BottomActionBar>
          <SecondaryButton>Cancel</SecondaryButton>
          <PrimaryButton>Continue</PrimaryButton>
        </BottomActionBar>
      }
      footer={<Footer />}
      header={
        <Header
          actions={<ColorSchemeToggle />}
          leading={<BackButton onClick={() => undefined} />}
          subtitle="Reusable component gallery"
          title="BoardScore UI"
        />
      }
    >
      <PageContainer py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Text c="boardBlue" fw={800} size="sm" tt="uppercase">
              Design system
            </Text>
            <Title order={2}>Built for fast play around the table</Title>
            <Text c="dimmed" maw={680}>
              Tablet-first controls, strong contrast, and generous touch
              targets. This gallery is development-only foundation, not an
              application page.
            </Text>
          </Stack>

          <CardSection labelledBy="actions-title">
            <Title id="actions-title" order={2} size="h3">
              Actions and status
            </Title>
            <Toolbar ariaLabel="Component examples">
              <PrimaryButton leftSection={<Plus aria-hidden size={20} />}>
                Add player
              </PrimaryButton>
              <SecondaryButton>Secondary action</SecondaryButton>
              <IconButton label="Settings">
                <Settings aria-hidden size={22} />
              </IconButton>
              <WinnerBadge />
              <RoundIndicator current={3} total={8} />
            </Toolbar>
          </CardSection>

          <CardSection labelledBy="games-title">
            <Title id="games-title" order={2} size="h3">
              Game cards
            </Title>
            <GameList ariaLabel="Example games">
              <GameListItem>
                <GameCard
                  description="Classic word scoring with a running total."
                  icon={<Dice5 size={24} />}
                  meta="2–4 players"
                  name="Scrabble"
                  selected
                  onSelect={() => undefined}
                />
              </GameListItem>
              <GameListItem>
                <GameCard
                  description="Build lines of matching colors and shapes."
                  icon={<Sparkles size={24} />}
                  meta="2–4 players"
                  name="Qwirkle"
                  onSelect={() => undefined}
                />
              </GameListItem>
              <GameListItem>
                <GameCard
                  description="Push your luck and track each round."
                  icon={<Dice5 size={24} />}
                  meta="3+ players"
                  name="Flip 7"
                  onSelect={() => undefined}
                />
              </GameListItem>
            </GameList>
          </CardSection>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <CardSection labelledBy="players-title">
              <Title id="players-title" order={2} size="h3">
                Players
              </Title>
              <PlayerList ariaLabel="Example players">
                <PlayerListItem>
                  <PlayerCard
                    action={<WinnerBadge />}
                    highlighted
                    leading={<Avatar color="boardBlue">M</Avatar>}
                    name="Mill"
                    score={128}
                    subtitle="Current leader"
                  />
                </PlayerListItem>
                <PlayerListItem>
                  <PlayerCard
                    action={
                      <IconButton label="Remove John">
                        <Trash2 aria-hidden size={20} />
                      </IconButton>
                    }
                    leading={<Avatar color="tableGreen">J</Avatar>}
                    name="John"
                    score={112}
                  />
                </PlayerListItem>
              </PlayerList>
            </CardSection>

            <CardSection labelledBy="scores-title">
              <Title id="scores-title" order={2} size="h3">
                Score summaries
              </Title>
              <SimpleGrid cols={2}>
                <ScoreCard
                  accent="positive"
                  detail="Round 3"
                  label="Added"
                  value="+18"
                />
                <ScoreCard detail="Overall" label="Total" value={128} />
              </SimpleGrid>
            </CardSection>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <CardSection labelledBy="inputs-title">
              <Title id="inputs-title" order={2} size="h3">
                Inputs
              </Title>
              <PlayerNameInput placeholder="Enter a name" />
              <SearchInput />
              <NumberInput label="Starting score" placeholder="0" />
            </CardSection>
            <NumericKeypad
              label="Score for Mill"
              onChange={setScore}
              onSubmit={() => undefined}
              value={score}
            />
          </SimpleGrid>

          <CardSection labelledBy="feedback-title">
            <Title id="feedback-title" order={2} size="h3">
              Feedback and dialogs
            </Title>
            <Group align="stretch" grow>
              <EmptyState
                action={<PrimaryButton>Choose game</PrimaryButton>}
                description="Select a template to begin scoring."
                icon={<Users size={28} />}
                title="No game selected"
              />
              <LoadingIndicator label="Restoring game" />
            </Group>
            <Divider />
            <Group>
              <SecondaryButton onClick={() => setConfirmOpen(true)}>
                Open confirmation
              </SecondaryButton>
              <SecondaryButton onClick={() => setResumeOpen(true)}>
                Open resume dialog
              </SecondaryButton>
            </Group>
          </CardSection>
        </Stack>
      </PageContainer>

      <ConfirmDialog
        destructive
        message="This removes the current unsaved entry."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        opened={confirmOpen}
        title="Discard entry?"
      />
      <ResumeSessionDialog
        detail="Round 3 · 4 players"
        gameName="Qwirkle"
        onDiscard={() => setResumeOpen(false)}
        onResume={() => setResumeOpen(false)}
        opened={resumeOpen}
      />
    </AppLayout>
  )
}
