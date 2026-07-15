import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import SelectSpoolPanel from '@/components/SelectSpoolPanel'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import styles from './SelectSpoolPage.module.css'

export default function SelectSpoolPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const printerId = searchParams.get('printerId') ?? ''
  const amsSlotParam = searchParams.get('amsSlot')
  const amsSlot = amsSlotParam ? Number(amsSlotParam) : null

  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [printer, setPrinter] = useState<PrinterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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

  const handleSelect = useCallback(async (spool: SpoolResponse) => {
    if (!printerId || !printer || assigning) return
    setAssigning(true)
    setError(null)
    try {
      if (amsSlot != null) {
        await printersApi.assignTraySpool(printerId, amsSlot, spool.id)
      } else {
        await printersApi.assignExtraSpool(printerId, spool.id)
      }
      navigate(-1)
    } catch {
      setError(t('selectSpool.assignError'))
      setAssigning(false)
    }
  }, [printerId, printer, amsSlot, assigning, navigate, t])

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
    </div>
  )
}
