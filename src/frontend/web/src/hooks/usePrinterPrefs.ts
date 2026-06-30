import { useState, useCallback } from 'react'

const PAGE_KEY = 'spoolhub_home_printer_page'
const PAGE_SIZE = 3

export function usePrinterPrefs() {
  const [page, setPageState] = useState<number>(() => {
    const v = localStorage.getItem(PAGE_KEY)
    return v ? parseInt(v, 10) : 1
  })

  const setPage = useCallback((n: number) => {
    setPageState(n)
    localStorage.setItem(PAGE_KEY, String(n))
  }, [])

  function slice<T>(items: T[]): T[] {
    return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }

  return { page, setPage, slice, pageSize: PAGE_SIZE }
}
