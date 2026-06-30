const imageMap: Record<string, string> = {
  'bambu lab x1 carbon':  '/printers/bambu/X1C.png',
  'bambu lab x1':         '/printers/bambu/X1C.png',
  'bambu lab x1e':        '/printers/bambu/X1E.png',
  'bambu lab p1s':        '/printers/bambu/P1S.png',
  'bambu lab p1p':        '/printers/bambu/P1S.png',
  'bambu lab p2s':        '/printers/bambu/P2S.png',
  'bambu lab a1':         '/printers/bambu/A1.png',
  'bambu lab a1 mini':    '/printers/bambu/A1mini.png',
  'bambu lab a2l':        '/printers/bambu/a2l.png',
  'bambu lab h2d':        '/printers/bambu/H2D.png',
  'bambu lab h2d pro':    '/printers/bambu/H2D.png',
  'bambu lab h2c':        '/printers/bambu/h2c.png',
  'bambu lab h2s':        '/printers/bambu/H2S.png',
  'bambu lab x2d':        '/printers/bambu/X2D.png',
}

export function getPrinterImage(brand: string, model: string): string {
  const key = `${brand.toLowerCase().trim()} ${model.toLowerCase().trim()}`
  return imageMap[key] ?? '/printers/bambu/A1.png'
}
