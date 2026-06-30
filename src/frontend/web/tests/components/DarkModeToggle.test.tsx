import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DarkModeToggle from '@/components/DarkModeToggle'

describe('DarkModeToggle', () => {
  it('renders the toggle button', () => {
    render(<DarkModeToggle isDark={false} onToggle={vi.fn()} />)
    expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<DarkModeToggle isDark={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('Toggle dark mode'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders in light mode without error', () => {
    const { container } = render(<DarkModeToggle isDark={false} onToggle={vi.fn()} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders in dark mode without error', () => {
    const { container } = render(<DarkModeToggle isDark={true} onToggle={vi.fn()} />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
