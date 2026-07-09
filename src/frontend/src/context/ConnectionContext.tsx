import { createContext, useContext, useEffect } from 'react'
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor'
import { invalidateSpoolsCache } from '@/api/spools'

interface ConnectionContextType {
  isOffline: boolean
  refreshKey: number
}

const ConnectionContext = createContext<ConnectionContextType>({ isOffline: false, refreshKey: 0 })

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const { isOffline, refreshKey } = useConnectionMonitor()

  useEffect(() => {
    if (refreshKey > 0) invalidateSpoolsCache()
  }, [refreshKey])

  return (
    <ConnectionContext.Provider value={{ isOffline, refreshKey }}>
      {children}
    </ConnectionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConnection() {
  return useContext(ConnectionContext)
}
