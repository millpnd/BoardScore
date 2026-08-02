import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { Moon, Sun } from 'lucide-react'

import { IconButton } from '../buttons'

export function ColorSchemeToggle() {
  const {
    colorScheme: preferenceColorScheme,
    clearColorScheme,
    setColorScheme,
  } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')
  const nextScheme = computedColorScheme === 'dark' ? 'light' : 'dark'
  const isUsingSystemScheme = preferenceColorScheme === 'auto'

  return (
    <IconButton
      label={
        isUsingSystemScheme ? `Use ${nextScheme} theme` : 'Use system theme'
      }
      onClick={() =>
        isUsingSystemScheme ? setColorScheme(nextScheme) : clearColorScheme()
      }
    >
      {computedColorScheme === 'dark' ? (
        <Sun aria-hidden size={22} />
      ) : (
        <Moon aria-hidden size={22} />
      )}
    </IconButton>
  )
}
