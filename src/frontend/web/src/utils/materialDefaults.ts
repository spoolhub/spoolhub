export interface MaterialTempDefaults {
  extruderMin: number
  extruderMax: number
  bedMin: number
  bedMax: number
}

const MATERIAL_TEMP_DEFAULTS: Record<string, MaterialTempDefaults> = {
  PETG: { extruderMin: 220, extruderMax: 250, bedMin: 70,  bedMax: 85  },
  HIPS: { extruderMin: 220, extruderMax: 240, bedMin: 85,  bedMax: 110 },
  PLA:  { extruderMin: 190, extruderMax: 230, bedMin: 35,  bedMax: 60  },
  ABS:  { extruderMin: 230, extruderMax: 260, bedMin: 85,  bedMax: 110 },
  ASA:  { extruderMin: 240, extruderMax: 260, bedMin: 85,  bedMax: 110 },
  TPU:  { extruderMin: 200, extruderMax: 240, bedMin: 30,  bedMax: 60  },
  PVA:  { extruderMin: 185, extruderMax: 210, bedMin: 45,  bedMax: 60  },
  PA:   { extruderMin: 260, extruderMax: 280, bedMin: 70,  bedMax: 90  },
  PC:   { extruderMin: 260, extruderMax: 280, bedMin: 100, bedMax: 120 },
}

export function getMaterialDefaults(material: string): MaterialTempDefaults | null {
  const m = material.toUpperCase()
  if (MATERIAL_TEMP_DEFAULTS[m]) return MATERIAL_TEMP_DEFAULTS[m]
  const sortedKeys = Object.keys(MATERIAL_TEMP_DEFAULTS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (m.startsWith(key)) return MATERIAL_TEMP_DEFAULTS[key]
  }
  return null
}
