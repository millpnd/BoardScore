import { MapPinOff } from 'lucide-react'
import { useNavigate } from 'react-router'

import {
  AppLayout,
  EmptyState,
  PageContainer,
  PrimaryButton,
} from '@/components'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <PageContainer py="xl">
        <EmptyState
          action={
            <PrimaryButton onClick={() => navigate('/')}>
              Return home
            </PrimaryButton>
          }
          description="The page you requested does not exist."
          icon={<MapPinOff size={28} />}
          title="Page not found"
        />
      </PageContainer>
    </AppLayout>
  )
}
