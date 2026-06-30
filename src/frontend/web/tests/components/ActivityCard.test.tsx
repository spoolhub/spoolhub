import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ActivityCard from '@/components/ActivityCard'
import type { Activity } from '@/types/activity'

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    eventType: 'SpoolScanned',
    action: 'Scanned',
    resourceType: 'Spool',
    resourceName: 'Bambu Lab Jade White',
    resourceId: 's1',
    description: null,
    icon: null,
    snapshot: {
      brand: 'Bambu Lab',
      colorName: 'Jade White',
      colorHex: '#E8E8E8',
      material: 'PLA',
      weight: 750,
    },
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    ...overrides,
  }
}

function renderFlat(activity: Activity) {
  return render(<ActivityCard activity={activity} flat />)
}

describe('ActivityCard flat — spool event', () => {
  it('shows the action label in line 1', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('Spool scanned')).toBeInTheDocument()
  })

  it('shows a day label (Today) in line 1', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows the brand name in line 2', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('shows the color name in line 2', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('shows the material badge in line 2', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows relative time in line 2', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('2 min ago')).toBeInTheDocument()
  })

  it('shows remaining weight in line 3', () => {
    renderFlat(makeActivity())
    expect(screen.getByText('750g')).toBeInTheDocument()
  })

  it('shows stock location in line 3', () => {
    const a = makeActivity({ snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 750, stockLocation: 'Shelf A' } })
    renderFlat(a)
    expect(screen.getByText('Shelf A')).toBeInTheDocument()
  })

  it('does not show weight row when snapshot has no weight', () => {
    const a = makeActivity({ snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA' } })
    renderFlat(a)
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — print completed (new design)', () => {
  it('shows the print completed action label', () => {
    renderFlat(makeActivity({
      eventType: 'PrintCompleted',
      resourceName: 'Bambu X1C',
      description: 'Bracket_v2.3mf — 15.3g used',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 600 },
    }))
    expect(screen.getByText('Print completed!')).toBeInTheDocument()
  })

  it('shows printer name in line 1', () => {
    renderFlat(makeActivity({ eventType: 'PrintCompleted', resourceName: 'Bambu X1C', description: 'Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
  })

  it('shows spool brand and material in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrintCompleted',
      resourceName: 'Bambu X1C',
      description: 'Bracket_v2.3mf — 15.3g used',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 600 },
    }))
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows grams used badge from description', () => {
    renderFlat(makeActivity({
      eventType: 'PrintCompleted',
      resourceName: 'Bambu X1C',
      description: 'Bracket_v2.3mf — 15.3g used',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 600 },
    }))
    expect(screen.getByText('15.3g')).toBeInTheDocument()
    expect(screen.getByText('used')).toBeInTheDocument()
  })

  it('shows file name in line 3', () => {
    renderFlat(makeActivity({ eventType: 'PrintCompleted', resourceName: 'Bambu X1C', description: 'Bracket_v2.3mf — 15.3g used', snapshot: null }))
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })
})

describe('ActivityCard flat — print started (new design)', () => {
  it('shows the print started action label', () => {
    renderFlat(makeActivity({ eventType: 'PrintStarted', resourceName: 'Bambu X1C', description: 'printing - Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Print started')).toBeInTheDocument()
  })

  it('shows printer name in line 1', () => {
    renderFlat(makeActivity({ eventType: 'PrintStarted', resourceName: 'Bambu X1C', description: 'printing - Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
  })

  it('shows spool info in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrintStarted',
      resourceName: 'Bambu X1C',
      description: 'printing - Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800 },
    }))
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows Printing badge and stripped file name in line 3', () => {
    renderFlat(makeActivity({ eventType: 'PrintStarted', resourceName: 'Bambu X1C', description: 'printing - Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Printing')).toBeInTheDocument()
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })

  it('shows estimated time before Printing badge in line 3', () => {
    renderFlat(makeActivity({
      eventType: 'PrintStarted',
      resourceName: 'Bambu X1C',
      description: 'printing - Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800, estimatedMins: 135 },
    }))
    expect(screen.getByText('2h 15m')).toBeInTheDocument()
    expect(screen.getByText('Printing')).toBeInTheDocument()
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })

  it('does not show used weight badge', () => {
    renderFlat(makeActivity({
      eventType: 'PrintStarted',
      resourceName: 'Bambu X1C',
      description: 'printing - Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800 },
    }))
    expect(screen.queryByText('used')).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — print paused (new design)', () => {
  it('shows print paused action label', () => {
    renderFlat(makeActivity({ eventType: 'PrintPaused', resourceName: 'Bambu X1C', description: 'paused Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Print paused')).toBeInTheDocument()
  })

  it('shows printer name in line 1', () => {
    renderFlat(makeActivity({ eventType: 'PrintPaused', resourceName: 'Bambu X1C', description: 'paused Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
  })

  it('shows remaining time and label in line 2 when snapshot has estimatedMins', () => {
    renderFlat(makeActivity({
      eventType: 'PrintPaused',
      resourceName: 'Bambu X1C',
      description: 'paused Bracket_v2.3mf',
      snapshot: { estimatedMins: 90 },
    }))
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
    expect(screen.getByText('remains')).toBeInTheDocument()
  })

  it('shows 0h Xm format when under 60 minutes', () => {
    renderFlat(makeActivity({
      eventType: 'PrintPaused',
      resourceName: 'Bambu X1C',
      description: 'paused Bracket_v2.3mf',
      snapshot: { estimatedMins: 15 },
    }))
    expect(screen.getByText('0h 15m')).toBeInTheDocument()
  })

  it('does not show spool brand in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrintPaused',
      resourceName: 'Bambu X1C',
      description: 'paused Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800, estimatedMins: 90 },
    }))
    expect(screen.queryByText('Bambu Lab')).not.toBeInTheDocument()
  })

  it('shows file name in line 3 with prefix stripped', () => {
    renderFlat(makeActivity({ eventType: 'PrintPaused', resourceName: 'Bambu X1C', description: 'paused Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })

  it('does not show used weight badge', () => {
    renderFlat(makeActivity({ eventType: 'PrintPaused', resourceName: 'Bambu X1C', description: 'paused Bracket_v2.3mf', snapshot: null }))
    expect(screen.queryByText('used')).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — print resumed (new design)', () => {
  it('shows print resumed action label', () => {
    renderFlat(makeActivity({ eventType: 'PrintResumed', resourceName: 'Bambu X1C', description: 'resumed Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Print resumed')).toBeInTheDocument()
  })

  it('shows printer name in line 1', () => {
    renderFlat(makeActivity({ eventType: 'PrintResumed', resourceName: 'Bambu X1C', description: 'resumed Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
  })

  it('shows spool info in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrintResumed',
      resourceName: 'Bambu X1C',
      description: 'resumed Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800 },
    }))
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows file name in line 3 with prefix stripped', () => {
    renderFlat(makeActivity({ eventType: 'PrintResumed', resourceName: 'Bambu X1C', description: 'resumed Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })

  it('does not show used weight badge', () => {
    renderFlat(makeActivity({ eventType: 'PrintResumed', resourceName: 'Bambu X1C', description: 'resumed Bracket_v2.3mf', snapshot: null }))
    expect(screen.queryByText('used')).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — print failed (new design)', () => {
  it('shows print failed action label', () => {
    renderFlat(makeActivity({ eventType: 'PrintFailed', resourceName: 'Bambu X1C', description: 'failed: Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Print failed')).toBeInTheDocument()
  })

  it('shows printer name in line 1', () => {
    renderFlat(makeActivity({ eventType: 'PrintFailed', resourceName: 'Bambu X1C', description: 'failed: Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bambu X1C')).toBeInTheDocument()
  })

  it('shows spool info in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrintFailed',
      resourceName: 'Bambu X1C',
      description: 'failed: Bracket_v2.3mf',
      snapshot: { brand: 'Bambu Lab', colorName: 'Jade White', colorHex: '#E8E8E8', material: 'PLA', weight: 800 },
    }))
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows file name in line 3 with prefix stripped', () => {
    renderFlat(makeActivity({ eventType: 'PrintFailed', resourceName: 'Bambu X1C', description: 'failed: Bracket_v2.3mf', snapshot: null }))
    expect(screen.getByText('Bracket_v2.3mf')).toBeInTheDocument()
  })

  it('does not show used weight badge', () => {
    renderFlat(makeActivity({ eventType: 'PrintFailed', resourceName: 'Bambu X1C', description: 'failed: Bracket_v2.3mf', snapshot: null }))
    expect(screen.queryByText('used')).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — printer/brand event', () => {
  it('shows the resource summary in line 2', () => {
    renderFlat(makeActivity({
      eventType: 'PrinterAdded',
      resourceName: 'Bambu X1C',
      resourceType: 'Printer',
      snapshot: null,
    }))
    expect(screen.getByText(/Bambu X1C/)).toBeInTheDocument()
  })

  it('does not show a weight row', () => {
    renderFlat(makeActivity({
      eventType: 'PrinterAdded',
      resourceName: 'Bambu X1C',
      resourceType: 'Printer',
      snapshot: null,
    }))
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument()
  })
})

describe('ActivityCard flat — NFC event', () => {
  const nfcActivity = makeActivity({
    eventType: 'NfcTagRegistered',
    resourceName: '04:97:EC:A0:77:26:81',
    resourceType: 'NfcTag',
    description: 'Registered NFC tag 04:97:EC:A0:77:26:81 to Bambu Lab Jade White PLA',
    snapshot: {
      brand: 'Bambu Lab',
      colorName: 'Jade White',
      colorHex: '#E8E8E8',
      material: 'PLA',
      weight: 750,
    },
  })

  it('shows the NFC registered action label', () => {
    renderFlat(nfcActivity)
    expect(screen.getByText('NFC tag registered')).toBeInTheDocument()
  })

  it('shows brand and color name in line 2 from snapshot', () => {
    renderFlat(nfcActivity)
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('shows material badge in line 2 from snapshot', () => {
    renderFlat(nfcActivity)
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('shows tag UID in line 3', () => {
    renderFlat(nfcActivity)
    expect(screen.getByText('04:97:EC:A0:77:26:81')).toBeInTheDocument()
    expect(screen.getByText(/Tag UID/i)).toBeInTheDocument()
  })

  it('shows tag UID even when no snapshot', () => {
    renderFlat({ ...nfcActivity, snapshot: null })
    expect(screen.getByText('04:97:EC:A0:77:26:81')).toBeInTheDocument()
  })

  it('shows spool name and material badge from description in line 2 when no snapshot', () => {
    const noSnap = {
      ...nfcActivity,
      snapshot: null,
      description: 'Registered NFC tag 04:97:EC:A0:77:26:81 to Bambu Lab Jade White PLA',
    }
    renderFlat(noSnap)
    expect(screen.getByText('Bambu Lab Jade White')).toBeInTheDocument()
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })
})
