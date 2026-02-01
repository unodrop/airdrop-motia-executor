import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { encrypt } from '../utils/wallet-crypto'

const bodySchema = z.object({
  /** 明文私钥（0x 开头或 64 位 hex） */
  private_key: z.string().optional(),
  /** 明文助记词（空格分隔） */
  mnemonic: z.string().optional(),
}).refine((data) => data.private_key != null || data.mnemonic != null, {
  message: '至少提供 private_key 或 mnemonic 其一',
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WalletEncrypt',
  description: '用服务端 ENCRYPTED_KEY 加密私钥和/或助记词，返回密文（AES-256-GCM base64）',
  path: '/wallet/encrypt',
  method: 'POST',
  emits: [],
  flows: ['wallet'],
  bodySchema,
  responseSchema: {
    200: z.object({
      encrypted_private_key: z.string().optional(),
      encrypted_mnemonic: z.string().optional(),
    }),
    400: z.object({ error: z.string() }),
    503: z.object({ error: z.string() }),
  },
  includeFiles: ['../utils/wallet-crypto.ts'],
}

export const handler: Handlers['WalletEncrypt'] = async (req, { logger }) => {
  const key = process.env.ENCRYPTED_KEY
  if (!key) {
    logger.warn('ENCRYPTED_KEY not set')
    return { status: 503, body: { error: 'ENCRYPTED_KEY not configured' } }
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return { status: 400, body: { error: parsed.error.message } }
  }

  const { private_key, mnemonic } = parsed.data
  const result: { encrypted_private_key?: string; encrypted_mnemonic?: string } = {}

  try {
    if (private_key != null && private_key !== '') {
      result.encrypted_private_key = encrypt(private_key.trim(), key)
    }
    if (mnemonic != null && mnemonic !== '') {
      result.encrypted_mnemonic = encrypt(mnemonic.trim(), key)
    }
  } catch (err) {
    logger.error('Encrypt failed', { error: String(err) })
    return { status: 400, body: { error: String(err) } }
  }

  return { status: 200, body: result }
}
