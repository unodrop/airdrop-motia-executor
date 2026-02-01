/**
 * Market data via Yahoo Finance: historical bars for MA/RSI, current quote.
 */

import YahooFinance from 'yahoo-finance2'

const yahoo = new YahooFinance()

const DEFAULT_DAYS = 70

/** Daily bar with close price (date descending = most recent first from Yahoo). */
export type DailyBar = { date: Date; close: number }

/**
 * Fetch daily historical bars for a symbol. Returns most recent first.
 */
export async function getHistorical(
  symbol: string,
  days: number = DEFAULT_DAYS
): Promise<DailyBar[]> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const raw = await yahoo.historical(symbol, {
    period1: start,
    period2: end,
    interval: '1d',
    events: 'history',
  })

  const rows = (raw || []) as Array<{ date: Date; close: number }>
  return rows.map((r) => ({ date: r.date, close: r.close })).sort((a, b) => b.date.getTime() - a.date.getTime())
}

/**
 * Get current/latest price: prefer quote.regularMarketPrice, fallback to last close from historical.
 */
export async function getQuote(symbol: string): Promise<number> {
  try {
    const q = await yahoo.quote(symbol)
    const p = (q as { regularMarketPrice?: number }).regularMarketPrice
    if (p != null && typeof p === 'number') return p
  } catch {
    // fallback: last close from historical
  }
  const bars = await getHistorical(symbol, 5)
  if (bars.length === 0) throw new Error(`No price data for ${symbol}`)
  return bars[0].close
}

/**
 * Get price and same-day change %: prefer quote (regularMarketPrice + regularMarketChangePercent), fallback to historical.
 * bars: most recent first; if length >= 2, changePercent = (latest - prevClose) / prevClose * 100.
 */
export async function getQuoteWithChange(
  symbol: string,
  fallbackBars?: DailyBar[]
): Promise<{ price: number; changePercent?: number }> {
  try {
    const q = await yahoo.quote(symbol)
    const p = (q as { regularMarketPrice?: number }).regularMarketPrice
    const cp = (q as { regularMarketChangePercent?: number }).regularMarketChangePercent
    if (p != null && typeof p === 'number') {
      return { price: p, changePercent: cp != null && typeof cp === 'number' ? cp : undefined }
    }
  } catch {
    // fallback
  }
  const bars = fallbackBars ?? (await getHistorical(symbol, 5))
  if (bars.length === 0) throw new Error(`No price data for ${symbol}`)
  const price = bars[0].close
  const changePercent =
    bars.length >= 2 ? ((bars[0].close - bars[1].close) / bars[1].close) * 100 : undefined
  return { price, changePercent }
}

/**
 * Compute simple moving average of the last `period` closes.
 * Expects closes in chronological order (oldest first). Returns undefined if not enough data.
 */
export function computeMA(closes: number[], period: number): number | undefined {
  if (closes.length < period) return undefined
  const slice = closes.slice(-period)
  const sum = slice.reduce((a, b) => a + b, 0)
  return sum / period
}

/**
 * Compute RSI(period). Expects closes in chronological order (oldest first).
 * Returns undefined if not enough data.
 */
export function computeRSI(closes: number[], period: number = 14): number | undefined {
  if (closes.length < period + 1) return undefined
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!
    if (change > 0) gains += change
    else losses -= change
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}
