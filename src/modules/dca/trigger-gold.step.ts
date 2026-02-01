import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerGoldDCA',
  description: '手动触发黄金定投分析（拉价、MA/RSI、是否适合定投并推送 Telegram）',
  path: '/dca/gold',
  method: 'POST',
  emits: ['gold-dca-analyze'],
  flows: ['dca-reminder'],
  responseSchema: {
    200: z.object({ ok: z.boolean(), topic: z.literal('gold-dca-analyze') }),
  },
}

export const handler: Handlers['TriggerGoldDCA'] = async (_req, { emit, logger }) => {
  await emit({ topic: 'gold-dca-analyze', data: {} })
  logger.info('Triggered gold-dca-analyze')
  return { status: 200, body: { ok: true, topic: 'gold-dca-analyze' as const } }
}
