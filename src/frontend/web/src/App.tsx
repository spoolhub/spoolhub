import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from '@/api/session'
import { ConnectionProvider, useConnection } from '@/context/ConnectionContext'
import { DesignProvider } from '@/context/DesignContext'
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import SpoolsPage from '@/pages/SpoolsPage'
import SettingsPage from '@/pages/SettingsPage'
import ScanPage from '@/pages/ScanPage'
import BrandsPage from '@/pages/BrandsPage'
import SpoolProfilePage from '@/pages/SpoolProfilePage'
import AddSpoolProfilePage from '@/pages/AddSpoolProfilePage'
import AddSpoolPage from '@/pages/AddSpoolPage'
import Dashboard from '@/pages/Dashboard'
import PrintersPage from '@/pages/PrintersPage'
import AddPrinterPage from '@/pages/AddPrinterPage'
import LowStockPage from '@/pages/LowStockPage'
import ActiveSpoolsPage from '@/pages/ActiveSpoolsPage'
import ActivityPage from '@/pages/ActivityPage'
import SelectSpoolPage from '@/pages/SelectSpoolPage'
import LocationsPage from '@/pages/LocationsPage'
import PrintHistoryPage from './pages/PrintHistoryPage/PrintHistoryPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ConnectionBanner from '@/components/ConnectionBanner/ConnectionBanner'
import { spoolsApi } from '@/api/spools'
import styles from './App.module.css'

function AppShell() {
  const { isOpen: sidebarOpen, close: closeSidebar } = useSidebar()
  const [spoolCount, setSpoolCount] = useState<number | undefined>(undefined)
  const { isOffline } = useConnection()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const spools = await spoolsApi.getAll()
        if (!cancelled) setSpoolCount(spools.length)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <ConnectionBanner />
      <div className="min-h-dvh sm:h-dvh flex flex-col bg-[var(--bg)] transition-colors duration-200">
        <div className="sm:h-dvh sm:flex sm:gap-6 sm:overflow-hidden bg-[var(--bg)]">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} spoolCount={spoolCount} />

          <main
            className={`flex-1 min-h-0 overflow-y-auto ${isOffline ? styles.mainOffline : styles.mainOnline}`}
          >
            <Header />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/spools" element={<SpoolsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/printers" element={<PrintersPage />} />
              <Route path="/printers/addprinter" element={<AddPrinterPage />} />
              <Route path="/spools/add" element={<AddSpoolPage />} />
              <Route path="/spools/add/nfctag" element={<AddSpoolPage />} />
              <Route path="/spools/add/manual" element={<AddSpoolPage />} />
              <Route path="/spools/select" element={<SelectSpoolPage />} />
              <Route path="/spools/active" element={<ActiveSpoolsPage />} />
              <Route path="/spools/low" element={<LowStockPage />} />
              <Route path="/brands" element={<BrandsPage />} />
              <Route path="/brands" element={<BrandsPage />} />
              <Route path="/brands/:brand" element={<BrandsPage />} />
              <Route path="/brands/:brand/:colorName" element={<BrandsPage />} />
              <Route path="/spool-profiles" element={<SpoolProfilePage />} />
              <Route path="/spool-profiles/new" element={<AddSpoolProfilePage />} />
              <Route path="/print-history" element={<PrintHistoryPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/locations" element={<LocationsPage />} />
            </Routes>
          </main>
        </div>
      </div>

    </>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <ConnectionProvider>
      <DesignProvider>
        <SidebarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
              <Route path="/signup" element={<RedirectIfAuthed><SignupPage /></RedirectIfAuthed>} />
              <Route path="/*" element={<RequireAuth><AppShell /></RequireAuth>} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </DesignProvider>
    </ConnectionProvider>
  )
}
