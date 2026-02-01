import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerUSIndicesDCA',
  description: '手动触发美股（纳指、标普）定投分析（拉价、MA/RSI、是否适合定投并推送 Telegram）',
  path: '/dca/us-indices',
  method: 'POST',
  emits: ['us-indices-dca-analyze'],
  flows: ['dca-reminder'],
  responseSchema: {
    200: z.object({ ok: z.boolean(), topic: z.literal('us-indices-dca-analyze') }),
  },
}

export const handler: Handlers['TriggerUSIndicesDCA'] = async (_req, { emit, logger }) => {
  await emit({ topic: 'us-indices-dca-analyze', data: {} })
  logger.info('Triggered us-indices-dca-analyze')
  return { status: 200, body: { ok: true, topic: 'us-indices-dca-analyze' as const } }
}
