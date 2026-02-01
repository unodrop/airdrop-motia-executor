import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { getHistorical, getQuote, computeMA, computeRSI } from '../../services/market'
import { isSuitableForDCA } from '../../services/dca-indicator'
import { sendDCAAlert } from '../../services/notification'
import type { DCAAnalysisResult } from '../../types'

const GOLD_SYMBOL = 'GC=F'

export const config: EventConfig = {
  type: 'event',
  name: 'GoldDCAAnalyze',
  description: 'Fetch gold price, compute MA/RSI, judge DCA suitability, send Telegram',
  flows: ['dca-reminder'],
  subscribes: ['gold-dca-analyze'],
  emits: [],
  input: z.object({}),
  includeFiles: [
    '../../services/market.ts',
    '../../services/dca-indicator.ts',
    '../../services/notification.ts',
    '../../types.ts',
  ],
}

export const handler: Handlers['GoldDCAAnalyze'] = async (
  _input,
  { logger }
) => {
  try {
    const bars = await getHistorical(GOLD_SYMBOL, 70)
    if (bars.length < 20) {
      logger.warn('Gold: insufficient historical data', { count: bars.length })
      return
    }

    const closesChronological = [...bars].reverse().map((b) => b.close)
    const ma20 = computeMA(closesChronological, 20)
    const ma60 = computeMA(closesChronological, 60)
    const rsi = computeRSI(closesChronological, 14)
    let price: number
    try {
      price = await getQuote(GOLD_SYMBOL)
    } catch {
      price = bars[0]!.close
    }

    const verdict = isSuitableForDCA(price, ma20, ma60, rsi)
    const result: DCAAnalysisResult = {
      symbol: GOLD_SYMBOL,
      label: '黄金',
      price,
      ma20,
      ma60,
      rsi,
      suitable: verdict.suitable,
      reason: verdict.reason,
    }

    await sendDCAAlert({ market: 'gold', results: [result] })
    logger.info('Gold DCA alert sent', { suitable: verdict.suitable })
  } catch (err) {
    logger.error('Gold DCA analyze failed', { error: String(err) })
    throw err
  }
}
