import {
  Badge,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Blocks, Dice5, Layers3, Shapes } from 'lucide-react'
import type { ReactNode } from 'react'

const templateIcons: Readonly<Record<string, ReactNode>> = {
  blocks: <Blocks aria-hidden size={24} />,
  cards: <Layers3 aria-hidden size={24} />,
  dice: <Dice5 aria-hidden size={24} />,
  shapes: <Shapes aria-hidden size={24} />,
  'whole-word': <Blocks aria-hidden size={24} />,
}

export function GameTemplateIcon({ name }: { readonly name: string }) {
  return templateIcons[name] ?? <Dice5 aria-hidden size={24} />
}

export interface GameCardProps {
  readonly name: string
  readonly description: string
  readonly icon: ReactNode
  readonly meta?: string
  readonly selected?: boolean
  readonly onSelect?: () => void
}

export function GameCard({
  name,
  description,
  icon,
  meta,
  selected = false,
  onSelect,
}: GameCardProps) {
  return (
    <Card
      className="interactive-card"
      component={onSelect ? 'button' : 'article'}
      data-selected={selected || undefined}
      onClick={onSelect}
      type={onSelect ? 'button' : undefined}
    >
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon aria-hidden size="xl" variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={4} ta="left">
          <Title order={3} size="h4">
            {name}
          </Title>
          <Text c="dimmed" lineClamp={2} size="sm">
            {description}
          </Text>
          {meta ? <Badge variant="light">{meta}</Badge> : null}
        </Stack>
      </Group>
    </Card>
  )
}

export interface PlayerCardProps {
  readonly name: string
  readonly subtitle?: string
  readonly score?: number | string
  readonly leading?: ReactNode
  readonly action?: ReactNode
  readonly highlighted?: boolean
  readonly details?: ReactNode
}

export function PlayerCard({
  name,
  subtitle,
  score,
  leading,
  action,
  highlighted = false,
  details,
}: PlayerCardProps) {
  return (
    <Card className="player-card" data-highlighted={highlighted || undefined}>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          {leading}
          <Stack gap={2}>
            <Text fw={700} size="lg">
              {name}
            </Text>
            {subtitle ? (
              <Text c="dimmed" size="sm">
                {subtitle}
              </Text>
            ) : null}
          </Stack>
        </Group>
        <Group wrap="nowrap">
          {score !== undefined ? (
            <Text className="score-value" fw={800} size="xl">
              {score}
            </Text>
          ) : null}
          {action}
        </Group>
      </Group>
      {details ? <Stack mt="sm">{details}</Stack> : null}
    </Card>
  )
}

export interface ScoreCardProps {
  readonly label: string
  readonly value: number | string
  readonly detail?: string
  readonly accent?: 'positive' | 'negative' | 'neutral'
}

export function ScoreCard({
  label,
  value,
  detail,
  accent = 'neutral',
}: ScoreCardProps) {
  return (
    <Card className="score-card" data-accent={accent}>
      <Text c="dimmed" fw={600} size="sm">
        {label}
      </Text>
      <Text className="score-value" fw={800} size="2rem">
        {value}
      </Text>
      {detail ? <Text size="sm">{detail}</Text> : null}
    </Card>
  )
}
