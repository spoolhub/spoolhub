import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import SelectSpoolPanel from '@/components/SelectSpoolPanel'
import AmsConflictModal from '@/components/AmsConflictModal/AmsConflictModal'
import { getPrinterImage } from '@/utils/printerImages'
import { getSlotOccupant } from '@/utils/slotOccupant'
import type { SpoolResponse } from '@/types/spool'
import type { TraySpoolSummary } from '@/types/printer'
import styles from './SelectSpoolPage.module.css'

export default function SelectSpoolPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const printerId = searchParams.get('printerId') ?? ''
  const amsSlotParam = searchParams.get('amsSlot')
  const amsSlot = amsSlotParam ? Number(amsSlotParam) : null

  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [printer, setPrinter] = useState<Awaited<ReturnType<typeof printersApi.getById>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingSpool, setPendingSpool] = useState<SpoolResponse | null>(null)
  const [pendingOccupant, setPendingOccupant] = useState<TraySpoolSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      spoolsApi.getAll(),
      printerId ? printersApi.getById(printerId) : Promise.resolve(null),
    ])
      .then(([spoolData, printerData]) => {
        if (cancelled) return
        setSpools(spoolData)
        setPrinter(printerData)
      })
      .catch(() => { if (!cancelled) setSpools([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [printerId])

  const performAssign = useCallback(async (spool: SpoolResponse, displacedStockLocation?: string) => {
    if (!printerId || !printer) return
    setAssigning(true)
    setError(null)
    try {
      if (amsSlot != null) {
        await printersApi.assignTraySpool(printerId, amsSlot, spool.id, displacedStockLocation)
      } else {
        await printersApi.assignExtraSpool(printerId, spool.id, displacedStockLocation)
      }
      navigate(-1)
    } catch {
      setError(t('selectSpool.assignError'))
      setAssigning(false)
    }
  }, [printerId, printer, amsSlot, navigate, t])

  const handleSelect = useCallback(async (spool: SpoolResponse) => {
    if (!printerId || !printer || assigning) return
    const occupant = getSlotOccupant(printer, amsSlot, spool.id)
    if (occupant) {
      setPendingSpool(spool)
      setPendingOccupant(occupant)
      return
    }
    await performAssign(spool)
  }, [printerId, printer, amsSlot, assigning, performAssign])

  if (!printer && !loading) {
    return (
      <div className={`${styles.page} page`}>
        <p>{t('selectSpool.noAvailable')}</p>
      </div>
    )
  }

  return (
    <div className={`${styles.page} page`}>
      {printer && (
        <SelectSpoolPanel
          printer={printer}
          spools={spools}
          amsSlot={amsSlot}
          loading={loading}
          assigning={assigning}
          error={error}
          onSelect={handleSelect}
          onBack={() => navigate(-1)}
          variant="page"
        />
      )}
      <div style={{ height: 70 }} />
      {pendingSpool && pendingOccupant && printer && (
        <AmsConflictModal
          printerImgSrc={getPrinterImage(printer.brand, printer.model)}
          printerBrand={printer.brand}
          printerModel={printer.model}
          traySlot={amsSlot ?? undefined}
          occupantSpool={pendingOccupant}
          onCancel={() => {
            setPendingSpool(null)
            setPendingOccupant(null)
          }}
          onConfirm={(loc) => {
            const spool = pendingSpool
            setPendingSpool(null)
            setPendingOccupant(null)
            void performAssign(spool, loc)
          }}
        />
      )}
    </div>
  )
}
