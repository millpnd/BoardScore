import '@mantine/core/styles.css'
import './styles.css'

import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'

import { App } from '@/app/App'
import { boardScoreTheme } from '@/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto" theme={boardScoreTheme}>
      <HashRouter>
        <App />
      </HashRouter>
    </MantineProvider>
  </StrictMode>,
)
