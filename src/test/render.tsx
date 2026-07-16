import { MantineProvider } from '@mantine/core'
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react'
import type { ReactNode } from 'react'

import { boardScoreTheme } from '@/theme'

export const renderWithTheme = (
  ui: ReactNode,
  options?: RenderOptions,
): RenderResult =>
  render(
    <MantineProvider theme={boardScoreTheme}>{ui}</MantineProvider>,
    options,
  )
