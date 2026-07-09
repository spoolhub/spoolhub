const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#22c55e', PETG: '#3b82f6', ABS: '#ef4444', TPU: '#f97316',
  ASA: '#a855f7', Nylon: '#eab308', PA: '#eab308', PC: '#06b6d4',
  HIPS: '#6b7280', PVA: '#ec4899',
}

export function getMaterialColor(material: string): string {
  const key = Object.keys(MATERIAL_COLORS).find(k => material.toUpperCase().includes(k.toUpperCase()))
  return key ? MATERIAL_COLORS[key] : '#6b7280'
}
