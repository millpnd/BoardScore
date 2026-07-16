import { Alert, Stack, Text, Title } from '@mantine/core'
import { AlertCircle, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTemplateStore } from '@/app/useStores'
import {
  AppLayout,
  BackButton,
  EmptyState,
  GameCard,
  GameList,
  GameListItem,
  GameTemplateIcon,
  Header,
  LoadingIndicator,
  PageContainer,
  SearchInput,
} from '@/components'

export function GameSelectionPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const templates = useTemplateStore((state) => state.templates)
  const isLoading = useTemplateStore((state) => state.isLoading)
  const error = useTemplateStore((state) => state.error)
  const loadTemplates = useTemplateStore((state) => state.loadTemplates)
  const setActiveTemplate = useTemplateStore((state) => state.setActiveTemplate)

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query
      ? templates.filter(
          ({ name, description }) =>
            name.toLocaleLowerCase().includes(query) ||
            description.toLocaleLowerCase().includes(query),
        )
      : templates
  }, [search, templates])

  const chooseTemplate = (id: string) => {
    setActiveTemplate(id)
    navigate('/players')
  }

  return (
    <AppLayout
      header={
        <Header
          leading={<BackButton onClick={() => navigate('/')} />}
          subtitle="Choose a scoring template"
          title="Select a game"
        />
      }
    >
      <PageContainer py="xl">
        <Stack gap="xl">
          <Stack gap="sm">
            <Title order={2}>What are you playing?</Title>
            <Text c="dimmed">
              Built-in and custom templates use the same scoring flow.
            </Text>
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </Stack>

          {error ? (
            <Alert
              color="red"
              icon={<AlertCircle aria-hidden size={20} />}
              title="Templates unavailable"
            >
              {error}
            </Alert>
          ) : null}
          {isLoading && templates.length === 0 ? (
            <LoadingIndicator label="Loading games" />
          ) : visibleTemplates.length === 0 ? (
            <EmptyState
              description="Try another game name."
              icon={<SearchX size={28} />}
              title="No games found"
            />
          ) : (
            <GameList ariaLabel="Available games">
              {visibleTemplates.map((template) => (
                <GameListItem key={template.id}>
                  <GameCard
                    description={template.description}
                    icon={<GameTemplateIcon name={template.icon} />}
                    meta={
                      template.maximumPlayers === null
                        ? `${template.minimumPlayers}+ players`
                        : `${template.minimumPlayers}–${template.maximumPlayers} players`
                    }
                    name={template.name}
                    onSelect={() => chooseTemplate(template.id)}
                  />
                </GameListItem>
              ))}
            </GameList>
          )}
        </Stack>
      </PageContainer>
    </AppLayout>
  )
}
