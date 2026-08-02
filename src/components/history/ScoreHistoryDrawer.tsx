import { Drawer, Group, Paper, Stack, Text } from '@mantine/core'
import { History } from 'lucide-react'

import type { GameSession, ScoreEvent } from '@/models'
import { ScoreEventType } from '@/models'

export interface ScoreHistoryDrawerProps {
  readonly opened: boolean
  readonly session: GameSession
  readonly onClose: () => void
}

const formatPoints = (points: number): string => {
  const sign = points < 0 ? '−' : '+'
  return `${sign}${Math.abs(points).toLocaleString()}`
}

const getPlayerName = (session: GameSession, event: ScoreEvent): string =>
  session.players.find(({ id }) => id === event.playerId)?.name ??
  'Unknown player'

interface ScoreHistoryGroup {
  readonly description?: string
  readonly id: string
  readonly title: string
  readonly events: readonly ScoreEvent[]
}

const getHistoryGroups = (session: GameSession): readonly ScoreHistoryGroup[] => {
  const groups = new Map<string, ScoreHistoryGroup>()

  for (const event of [...session.scoreEvents].reverse()) {
    const round =
      event.roundId === undefined
        ? undefined
        : session.rounds.find(({ id }) => id === event.roundId)
    const id = round
      ? `round:${round.id}`
      : event.roundId === undefined
        ? 'running-total'
        : 'other'
    const existing = groups.get(id)

    if (existing) {
      groups.set(id, { ...existing, events: [...existing.events, event] })
    } else {
      groups.set(id, {
        events: [event],
        id,
        title:
          round ? `Round ${round.number}` : id === 'running-total'
            ? 'Score changes'
            : 'Other scores',
        description:
          id === 'running-total'
            ? "Each entry adds to the player's running total."
            : undefined,
      })
    }
  }

  return [...groups.values()]
}

function ScoreHistoryEntry({
  event,
  session,
}: {
  readonly event: ScoreEvent
  readonly session: GameSession
}) {
  return (
    <Paper
      className="score-history-entry"
      component="li"
      p="md"
      radius="md"
      withBorder
    >
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <Stack gap={4} miw={0}>
          <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
            {getPlayerName(session, event)}
          </Text>
          <Group gap="xs" wrap="wrap">
            {event.type === ScoreEventType.Correction ? (
              <Text c="dimmed" size="sm">
                Correction
              </Text>
            ) : null}
          </Group>
        </Stack>
        <Text
          c={event.points < 0 ? 'red' : event.points > 0 ? 'green' : 'dimmed'}
          fw={700}
          size="lg"
          style={{ flexShrink: 0 }}
        >
          {formatPoints(event.points)}
        </Text>
      </Group>
    </Paper>
  )
}

export function ScoreHistoryDrawer({
  opened,
  session,
  onClose,
}: ScoreHistoryDrawerProps) {
  const groups = getHistoryGroups(session)

  return (
    <Drawer
      aria-label="Score history"
      closeButtonProps={{
        'aria-label': 'Close score history',
        size: 'lg',
      }}
      onClose={onClose}
      opened={opened}
      position="right"
      size="min(100vw, 28rem)"
      title="Score history"
    >
      {groups.length === 0 ? (
        <Stack align="center" justify="center" mih="14rem" ta="center">
          <History aria-hidden size={32} />
          <Text c="dimmed">No scores recorded yet.</Text>
        </Stack>
      ) : (
        <Stack
          aria-label="Score history groups"
          component="ul"
          className="unstyled-list"
          gap="sm"
        >
          {groups.map((group, groupIndex) => (
            <Paper
              aria-labelledby={`score-history-group-${groupIndex}`}
              component="li"
              key={group.id}
              p="md"
              radius="md"
              withBorder
            >
              <Stack gap="sm">
                <Text
                  component="h3"
                  fw={700}
                  id={`score-history-group-${groupIndex}`}
                  size="lg"
                >
                  {group.title}
                </Text>
                {group.description ? (
                  <Text c="dimmed" size="sm">
                    {group.description}
                  </Text>
                ) : null}
                <Stack
                  aria-label={`${group.title} score entries`}
                  component="ol"
                  className="unstyled-list"
                  gap="sm"
                >
                  {group.events.map((event) => (
                    <ScoreHistoryEntry
                      event={event}
                      key={event.id}
                      session={session}
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Drawer>
  )
}
