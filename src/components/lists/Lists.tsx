import { SimpleGrid, Stack } from '@mantine/core'
import type { ReactNode } from 'react'

interface ListProps {
  readonly children: ReactNode
  readonly ariaLabel: string
}

export function PlayerList({ children, ariaLabel }: ListProps) {
  return (
    <Stack
      aria-label={ariaLabel}
      component="ul"
      className="unstyled-list"
      gap="sm"
    >
      {children}
    </Stack>
  )
}

export function PlayerListItem({ children }: { readonly children: ReactNode }) {
  return <li>{children}</li>
}

export function GameList({ children, ariaLabel }: ListProps) {
  return (
    <SimpleGrid
      aria-label={ariaLabel}
      className="game-list"
      cols={{ base: 1, sm: 2, md: 3 }}
      component="ul"
      spacing="md"
    >
      {children}
    </SimpleGrid>
  )
}

export function GameListItem({ children }: { readonly children: ReactNode }) {
  return <li>{children}</li>
}
