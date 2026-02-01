import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  id: z.string().min(1, 'id 必填，为钱包 UUID'),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerPharosCheckin',
  description: '手动触发一次 Pharos 签到，传入钱包 id（Supabase wallets 表主键）',
  path: '/pharos/checkin',
  method: 'POST',
  emits: ['pharos-checkin'],
  flows: ['pharos-checkin'],
  bodySchema,
  responseSchema: {
    200: z.object({ ok: z.boolean(), id: z.string() }),
    400: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['TriggerPharosCheckin'] = async (req, { emit, logger }) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return { status: 400, body: { error: parsed.error.message } }
  }
  const { id } = parsed.data
  await emit({ topic: 'pharos-checkin', data: { id } })
  logger.info('Triggered pharos-checkin', { id })
  return { status: 200, body: { ok: true, id } }
}
