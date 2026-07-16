import {
  Box,
  Container,
  Group,
  Paper,
  Stack,
  type BoxProps,
} from '@mantine/core'
import type { ReactNode } from 'react'

export interface AppLayoutProps {
  readonly header?: ReactNode
  readonly footer?: ReactNode
  readonly bottomAction?: ReactNode
  readonly children: ReactNode
}

export function AppLayout({
  header,
  footer,
  bottomAction,
  children,
}: AppLayoutProps) {
  return (
    <Box className="app-layout">
      {header}
      <ScrollableContent>{children}</ScrollableContent>
      {bottomAction}
      {footer}
    </Box>
  )
}

export interface PageContainerProps extends BoxProps {
  readonly children: ReactNode
}

export function PageContainer({ children, ...props }: PageContainerProps) {
  return (
    <Container className="page-container" size="md" {...props}>
      {children}
    </Container>
  )
}

export interface CardSectionProps {
  readonly children: ReactNode
  readonly labelledBy?: string
}

export function CardSection({ children, labelledBy }: CardSectionProps) {
  return (
    <Paper
      component="section"
      aria-labelledby={labelledBy}
      p="lg"
      radius="lg"
      withBorder
    >
      <Stack gap="md">{children}</Stack>
    </Paper>
  )
}

export interface ToolbarProps {
  readonly children: ReactNode
  readonly ariaLabel?: string
}

export function Toolbar({
  children,
  ariaLabel = 'Page actions',
}: ToolbarProps) {
  return (
    <Group
      component="nav"
      aria-label={ariaLabel}
      className="toolbar"
      gap="sm"
      wrap="wrap"
    >
      {children}
    </Group>
  )
}

export function BottomActionBar({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <Paper
      className="bottom-action-bar"
      component="aside"
      radius={0}
      shadow="md"
    >
      <PageContainer>
        <Group grow>{children}</Group>
      </PageContainer>
    </Paper>
  )
}

export function ScrollableContent({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <Box className="scrollable-content" component="main">
      {children}
    </Box>
  )
}
