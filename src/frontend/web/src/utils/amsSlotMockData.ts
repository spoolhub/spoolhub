export interface AmsSlot {
  color: string
  material: string
  colorName: string
}

// Mock AMS tray data keyed by printer ID.
// In a future milestone this will come from the real MQTT/cloud feed.
const slotsByPrinterId: Record<string, (AmsSlot | null)[]> = {}

const defaultSlots: (AmsSlot | null)[] = [
  { color: '#FFFFFF', material: 'PLA', colorName: 'White' },
  { color: '#000000', material: 'PLA', colorName: 'Black' },
  { color: '#22d3ee', material: 'PETG', colorName: 'Cyan' },
  null,
]

export function getAmsSlots(printerId: string): (AmsSlot | null)[] {
  return slotsByPrinterId[printerId] ?? defaultSlots
}
