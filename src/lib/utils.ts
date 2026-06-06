import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a purse amount with the league's currency symbol + suffix (e.g. "$115M"). */
export function formatCurrency(amount: number, symbol = '$', suffix = 'M'): string {
  return `${symbol}${amount.toLocaleString('en-US')}${suffix}`
}
