import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { Moon, Sun } from 'lucide-react'

import { IconButton } from '../buttons'

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const colorScheme = useComputedColorScheme('light')
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark'

  return (
    <IconButton
      label={`Use ${nextScheme} theme`}
      onClick={() => setColorScheme(nextScheme)}
    >
      {colorScheme === 'dark' ? (
        <Sun aria-hidden size={22} />
      ) : (
        <Moon aria-hidden size={22} />
      )}
    </IconButton>
  )
}
