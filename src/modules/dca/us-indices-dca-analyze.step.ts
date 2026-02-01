import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { getHistorical, getQuote, computeMA, computeRSI } from '../../services/market'
import { isSuitableForDCA } from '../../services/dca-indicator'
import { sendDCAAlert } from '../../services/notification'
import type { DCAAnalysisResult } from '../../types'

const SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: '^IXIC', label: '纳指' },
  { symbol: '^GSPC', label: '标普' },
]

export const config: EventConfig = {
  type: 'event',
  name: 'USIndicesDCAAnalyze',
  description: 'Fetch NASDAQ & S&P price, compute MA/RSI, judge DCA, send one Telegram',
  flows: ['dca-reminder'],
  subscribes: ['us-indices-dca-analyze'],
  emits: [],
  input: z.object({}),
  includeFiles: [
    '../../services/market.ts',
    '../../services/dca-indicator.ts',
    '../../services/notification.ts',
    '../../types.ts',
  ],
}

export const handler: Handlers['USIndicesDCAAnalyze'] = async (
  _input,
  { logger }
) => {
  const results: DCAAnalysisResult[] = []

  for (const { symbol, label } of SYMBOLS) {
    try {
      const bars = await getHistorical(symbol, 70)
      if (bars.length < 20) {
        logger.warn('US index: insufficient data', { symbol, count: bars.length })
        continue
      }

      const closesChronological = [...bars].reverse().map((b) => b.close)
      const ma20 = computeMA(closesChronological, 20)
      const ma60 = computeMA(closesChronological, 60)
      const rsi = computeRSI(closesChronological, 14)
      let price: number
      try {
        price = await getQuote(symbol)
      } catch {
        price = bars[0]!.close
      }

      const verdict = isSuitableForDCA(price, ma20, ma60, rsi)
      results.push({
        symbol,
        label,
        price,
        ma20,
        ma60,
        rsi,
        suitable: verdict.suitable,
        reason: verdict.reason,
      })
    } catch (err) {
      logger.error('US index DCA failed', { symbol, error: String(err) })
    }
  }

  if (results.length > 0) {
    await sendDCAAlert({ market: 'us', results })
    logger.info('US indices DCA alert sent', { count: results.length })
  }
}
