import '@testing-library/jest-dom'
import '@/i18n'
import { vi } from 'vitest'

vi.mock('@/api/activities', () => ({
  activitiesApi: {
    getRecent: vi.fn().mockResolvedValue({
      activities: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  },
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
