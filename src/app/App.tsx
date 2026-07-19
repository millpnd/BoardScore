import { Route, Routes } from 'react-router'

import {
  GameSelectionPage,
  HomePage,
  NotFoundPage,
  PlayerSetupPage,
  ScoringPage,
  WinnerPage,
} from '@/pages'

import { StoreProvider } from './StoreProvider'

export function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<GameSelectionPage />} path="/games" />
      <Route element={<PlayerSetupPage />} path="/players" />
      <Route element={<ScoringPage />} path="/scoring" />
      <Route element={<WinnerPage />} path="/winner" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  )
}
