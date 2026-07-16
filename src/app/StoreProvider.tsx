import type { ReactNode } from 'react'

import {
  defaultStores,
  StoreContext,
  type SetupFlowStores,
} from './storeContext'

export function StoreProvider({
  children,
  stores = defaultStores,
}: {
  readonly children: ReactNode
  readonly stores?: SetupFlowStores
}) {
  return (
    <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>
  )
}
