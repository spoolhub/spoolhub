import { NotificationsProvider } from '@/context/NotificationsContext'

export function withNotificationsProvider(children: React.ReactNode) {
  return <NotificationsProvider>{children}</NotificationsProvider>
}
