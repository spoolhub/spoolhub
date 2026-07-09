import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import PrintHistoryList from '@/components/PrintHistory/PrintHistoryList'
import type { PrintJobResponse } from '@/types/printJob'

function makeJob(overrides: Partial<PrintJobResponse> = {}): PrintJobResponse {
  return {
    id: 'j1', printerId: 'p1', printerName: null,
    spoolId: 's1', spoolColorName: 'Jade White', spoolColorHex: '#fff', spoolMaterial: 'PLA',
    printFileName: 'Bracket_v2', status: 'finished', gramsUsed: 15,
    startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z',
    source: 'mqtt', notes: null, filaments: [],
    ...overrides,
  }
}

function renderList(jobs: PrintJobResponse[], showSpool = false) {
  return render(
    <MemoryRouter>
      <PrintHistoryList jobs={jobs} showSpool={showSpool} />
    </MemoryRouter>
  )
}

describe('PrintHistoryList', () => {
  it('shows the empty state when there are no jobs', () => {
    renderList([])
    expect(screen.getByText('No print jobs recorded yet.')).toBeInTheDocument()
  })

  it('spool view (showSpool=false) shows just the used grams, no spool link', () => {
    renderList([makeJob()])
    expect(screen.getByText('15.0g')).toBeInTheDocument()
    expect(screen.getByText('Bracket_v2')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('printer view (showSpool=true) renders a pill linking to the spool', () => {
    renderList([makeJob()], true)
    const link = screen.getAllByRole('link').find(l => l.getAttribute('href') === '/spools/s1')
    expect(link).toBeTruthy()
  })

  it('multi-color job links each filament spool', () => {
    const job = makeJob({
      spoolId: null, spoolColorName: null, spoolColorHex: null, spoolMaterial: null,
      filaments: [
        { id: 'f1', spoolId: 'sa', colorName: 'Red', colorHex: '#f00', material: 'PLA', gramsUsed: 10, slotIndex: 0 },
        { id: 'f2', spoolId: 'sb', colorName: 'Blue', colorHex: '#00f', material: 'PLA', gramsUsed: 5, slotIndex: 1 },
      ],
    })
    renderList([job], true)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === '/spools/sa')).toBe(true)
    expect(links.some(l => l.getAttribute('href') === '/spools/sb')).toBe(true)
  })

  it('shows a relative "hrs ago" time for a recent job', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    renderList([makeJob({ startedAt: twoHoursAgo, finishedAt: twoHoursAgo })])
    expect(screen.getByText('2 hrs ago')).toBeInTheDocument()
  })

  it('shows an exact date for an old job', () => {
    renderList([makeJob({ startedAt: '2020-03-04T09:00:00Z', finishedAt: '2020-03-04T10:00:00Z' })])
    // dayLabel falls back to an exact date string containing the year for jobs older than a week
    expect(screen.getByText(/2020/)).toBeInTheDocument()
  })
})
