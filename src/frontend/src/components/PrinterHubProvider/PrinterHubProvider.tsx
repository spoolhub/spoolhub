import { usePrinterHub } from '@/hooks/usePrinterHub'

/** Keeps the printer SignalR hub connected for the whole authenticated session. */
export function PrinterHubProvider({ children }: { children: React.ReactNode }) {
  usePrinterHub(() => {})
  return <>{children}</>
}
