import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SpoolSearchBar from '@/components/SpoolSearchBar'

describe('SpoolSearchBar', () => {
  it('renders the search input', () => {
    render(<SpoolSearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Search by brand/)).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SpoolSearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/Search by brand/), { target: { value: 'PLA' } })
    expect(onChange).toHaveBeenCalledWith('PLA')
  })

  it('shows clear button when value is set', () => {
    render(<SpoolSearchBar value="PLA" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<SpoolSearchBar value="" onChange={vi.fn()} />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('calls onChange with empty string when clear clicked', () => {
    const onChange = vi.fn()
    render(<SpoolSearchBar value="PLA" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Clear search'))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
