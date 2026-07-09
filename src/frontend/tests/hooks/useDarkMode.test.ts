import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '@/hooks/useDarkMode'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  localStorage.clear()
})

describe('useDarkMode', () => {
  it('defaults to dark when localStorage has no theme', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(true)
  })

  it('reads dark from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(true)
  })

  it('reads light from localStorage', () => {
    localStorage.setItem('theme', 'light')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.dark).toBe(false)
  })

  it('adds dark class to documentElement when dark is true', () => {
    localStorage.setItem('theme', 'dark')
    renderHook(() => useDarkMode())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when dark is false', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'light')
    renderHook(() => useDarkMode())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle() switches dark to light', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(result.current.dark).toBe(false)
  })

  it('toggle() switches light to dark', () => {
    localStorage.setItem('theme', 'light')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(result.current.dark).toBe(true)
  })

  it('persists theme to localStorage after toggle', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
