const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  CHF: 'Fr', JPY: '¥', CNY: 'CN¥', SEK: 'Kr', TRY: '₺',
}

export function getCurrencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

/** Display amount with currency — SEK uses Swedish style: `2,00 Kr`. */
export function formatCurrency(amount: number, code: string): string {
  if (code === 'SEK') {
    return `${amount.toFixed(2).replace('.', ',')} Kr`
  }
  return `${getCurrencySymbol(code)}${amount.toFixed(2)}`
}
