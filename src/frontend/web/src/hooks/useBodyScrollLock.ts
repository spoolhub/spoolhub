import { useEffect } from 'react'

export function useBodyScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY
    const main = document.querySelector<HTMLElement>('.main')
    const mainScrollY = main?.scrollTop ?? 0

    // Nudge a real (non-cancelling) scroll before freezing so Safari
    // registers actual scroll motion and collapses its bottom toolbar —
    // a scrollBy(+1)/scrollBy(-1) round trip nets to zero and doesn't
    // reliably trigger it. The 1px offset is imperceptible.
    window.scrollTo(0, scrollY + 1)

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY + 1}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    if (main) main.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      window.scrollTo(0, scrollY)
      if (main) {
        main.style.overflow = ''
        main.scrollTop = mainScrollY
      }
    }
  }, [])
}
