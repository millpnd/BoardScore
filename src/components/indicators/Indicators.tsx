import { Badge, Center, Loader, Stack, Text, ThemeIcon } from '@mantine/core'
import { Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

export function WinnerBadge({ label = 'Winner' }: { readonly label?: string }) {
  return (
    <Badge
      color="yellow"
      leftSection={<Trophy aria-hidden size={14} />}
      size="lg"
      variant="light"
    >
      {label}
    </Badge>
  )
}

export function RoundIndicator({
  current,
  total,
}: {
  readonly current: number
  readonly total?: number
}) {
  return (
    <Badge
      aria-label={total ? `Round ${current} of ${total}` : `Round ${current}`}
      size="lg"
      variant="outline"
    >
      Round {current}
      {total ? ` / ${total}` : ''}
    </Badge>
  )
}

export interface EmptyStateProps {
  readonly title: string
  readonly description?: string
  readonly icon?: ReactNode
  readonly action?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Center className="empty-state" component="section">
      <Stack align="center" gap="sm" maw={360} ta="center">
        {icon ? (
          <ThemeIcon aria-hidden radius="xl" size={64} variant="light">
            {icon}
          </ThemeIcon>
        ) : null}
        <Text fw={700} size="lg">
          {title}
        </Text>
        {description ? <Text c="dimmed">{description}</Text> : null}
        {action}
      </Stack>
    </Center>
  )
}

export function LoadingIndicator({
  label = 'Loading',
}: {
  readonly label?: string
}) {
  return (
    <Center aria-live="polite" role="status">
      <Stack align="center" gap="xs">
        <Loader aria-hidden size="md" />
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  )
}
