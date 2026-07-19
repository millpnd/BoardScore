import { Badge, Card, Group, Stack, Text } from '@mantine/core'
import { memo } from 'react'

import { WinnerBadge } from '../indicators'

export interface ScoringPlayerCardProps {
  readonly name: string
  readonly total: number
  readonly rank: number
  readonly roundScore?: number
  readonly selected: boolean
  readonly isLeader?: boolean
  readonly onSelect: () => void
}

export const ScoringPlayerCard = memo(function ScoringPlayerCard({
  name,
  total,
  rank,
  roundScore,
  selected,
  isLeader = false,
  onSelect,
}: ScoringPlayerCardProps) {
  return (
    <Card
      aria-pressed={selected}
      className="interactive-card scoring-player-card"
      component="button"
      data-selected={selected || undefined}
      onClick={onSelect}
      type="button"
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack align="flex-start" gap={4}>
          <Group gap="xs">
            <Badge aria-label={`Rank ${rank}`} color="gray" variant="light">
              #{rank}
            </Badge>
            {isLeader ? <WinnerBadge label="Leader" /> : null}
          </Group>
          <Text fw={750} size="lg">
            {name}
          </Text>
          {roundScore !== undefined ? (
            <Text c="dimmed" size="sm">
              Round score: <strong>{roundScore}</strong>
            </Text>
          ) : null}
        </Stack>
        <Stack align="flex-end" gap={0}>
          <Text c="dimmed" size="xs" tt="uppercase">
            Total
          </Text>
          <Text className="score-value" fw={850} size="2rem">
            {total}
          </Text>
        </Stack>
      </Group>
    </Card>
  )
})
