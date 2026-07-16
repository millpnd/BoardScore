import { Center, Stack, Text, Title } from '@mantine/core'

export function App() {
  return (
    <Center component="main" mih="100dvh" p="xl">
      <Stack align="center" gap="xs">
        <Title order={1}>BoardScore</Title>
        <Text c="dimmed">Project foundation ready.</Text>
      </Stack>
    </Center>
  )
}
