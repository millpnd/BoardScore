import { Box, Group, Text, ThemeIcon, Title } from '@mantine/core'
import { ArrowLeft, Dices } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconButton } from '../buttons'
import { PageContainer } from '../layout'

export interface HeaderProps {
  readonly title: string
  readonly subtitle?: string
  readonly leading?: ReactNode
  readonly actions?: ReactNode
}

export function BrandMark({ compact = false }: { readonly compact?: boolean }) {
  return (
    <Group aria-label="BoardScore" gap="sm" wrap="nowrap">
      <ThemeIcon color="boardBlue" radius="xl" size={compact ? 44 : 64}>
        <Dices aria-hidden size={compact ? 24 : 34} />
      </ThemeIcon>
      {compact ? null : (
        <Title order={1} size="2rem">
          BoardScore
        </Title>
      )}
    </Group>
  )
}

export function Header({ title, subtitle, leading, actions }: HeaderProps) {
  return (
    <Box className="app-header" component="header">
      <PageContainer>
        <Group justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            {leading}
            <Box>
              <Title order={1} size="h3">
                {title}
              </Title>
              {subtitle ? (
                <Text c="dimmed" size="sm">
                  {subtitle}
                </Text>
              ) : null}
            </Box>
          </Group>
          {actions}
        </Group>
      </PageContainer>
    </Box>
  )
}

export function Footer({ children }: { readonly children?: ReactNode }) {
  return (
    <Box className="app-footer" component="footer">
      <PageContainer>
        <Text c="dimmed" size="sm" ta="center">
          {children ?? 'BoardScore · Keep the game moving'}
        </Text>
      </PageContainer>
    </Box>
  )
}

export function BackButton({
  onClick,
  label = 'Go back',
}: {
  readonly onClick: () => void
  readonly label?: string
}) {
  return (
    <IconButton label={label} onClick={onClick}>
      <ArrowLeft aria-hidden size={22} />
    </IconButton>
  )
}
