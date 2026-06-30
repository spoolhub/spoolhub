const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  CHF: 'Fr', JPY: '¥', CNY: 'CN¥', SEK: 'SEK', TRY: '₺',
}

export function getCurrencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}
