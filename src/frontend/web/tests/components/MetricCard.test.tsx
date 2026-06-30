import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { MetricCard } from '@/components/MetricCard/MetricCard'

function render_(props: Partial<React.ComponentProps<typeof MetricCard>> = {}) {
  const defaultProps = {
    label: 'TEST',
    value: 42,
    loading: false,
    icon: <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20"/></svg>,
    ...props,
  }
  return render(<MetricCard {...defaultProps} />, { wrapper: MemoryRouter })
}

describe('MetricCard', () => {
  it('renders label', () => {
    render_({ label: 'Total Spools' })
    expect(screen.getByText('Total Spools')).toBeInTheDocument()
  })

  it('renders numeric value', () => {
    render_({ value: 100 })
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render_({ value: '$45.99' })
    expect(screen.getByText('$45.99')).toBeInTheDocument()
  })

  it('renders trend text when provided', () => {
    render_({ trend: { text: '4 currently in use', variant: 'positive' } })
    expect(screen.getByText('4 currently in use')).toBeInTheDocument()
  })

  it('renders sub text when provided', () => {
    render_({ suffix: 'kg remaining' })
    expect(screen.getByText('kg remaining')).toBeInTheDocument()
  })

  it('renders link when to prop is provided', () => {
    render_({ to: '/spools' })
    expect(screen.getByRole('link')).toHaveAttribute('href', '/spools')
  })

  it('does not render trend when loading', () => {
    render_({ loading: true, trend: { text: 'loading test', variant: 'neutral' } })
    expect(screen.queryByText('loading test')).not.toBeInTheDocument()
  })

  it('renders icon', () => {
    const { container } = render_({ icon: <svg data-testid="card-icon" viewBox="0 0 24 24" /> })
    expect(container.querySelector('[data-testid="card-icon"]')).toBeInTheDocument()
  })
})
