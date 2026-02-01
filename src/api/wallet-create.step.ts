import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { encrypt } from '../utils/wallet-crypto'
import { createRandomEVMWallet } from '../utils/ethers'
import { createRandomSolanaWallet } from '../utils/solana'
import { getRandomUserAgent } from '../utils/ua'
import { insertWallet } from '../repositories/wallet.repository'

const walletTypeSchema = z.enum(['evm', 'solana'])
export type WalletType = z.infer<typeof walletTypeSchema>

const bodySchema = z.object({
  /** 钱包类型：evm（Ethereum/BSC 等）或 solana */
  wallet_type: walletTypeSchema,
  /** 创建数量，1–100 */
  count: z.number().int().min(1).max(100),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WalletCreate',
  description: '按钱包类型和数量创建钱包，加密后写入数据库，并为每个钱包生成随机 UA 保存',
  path: '/wallet/create',
  method: 'POST',
  emits: [],
  flows: ['wallet'],
  bodySchema,
  responseSchema: {
    200: z.object({
      created: z.number(),
      ids: z.array(z.string().uuid()),
      addresses: z.array(z.string()),
    }),
    400: z.object({ error: z.string() }),
    503: z.object({ error: z.string() }),
  },
  includeFiles: [
    '../utils/wallet-crypto.ts',
    '../utils/ethers.ts',
    '../utils/solana.ts',
    '../utils/ua.ts',
    '../repositories/wallet.repository.ts',
  ],
}

export const handler: Handlers['WalletCreate'] = async (req, { logger }) => {
  const key = process.env.ENCRYPTED_KEY
  if (!key) {
    logger.warn('ENCRYPTED_KEY not set')
    return { status: 503, body: { error: 'ENCRYPTED_KEY not configured' } }
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return { status: 400, body: { error: parsed.error.message } }
  }

  const { wallet_type, count } = parsed.data
  const ids: string[] = []
  const addresses: string[] = []

  for (let i = 0; i < count; i++) {
    const wallet =
      wallet_type === 'evm'
        ? createRandomEVMWallet()
        : createRandomSolanaWallet()
    const privateKeyEncrypted = encrypt(wallet.privateKey, key)
    const mnemonicEncrypted =
      wallet.mnemonicPhrase != null && wallet.mnemonicPhrase !== ''
        ? encrypt(wallet.mnemonicPhrase, key)
        : null
    const userAgent = getRandomUserAgent()

    try {
      const id = await insertWallet({
        address: wallet.address,
        private_key_encrypted: privateKeyEncrypted,
        mnemonic_encrypted: mnemonicEncrypted,
        user_agent: userAgent,
        chain: wallet_type,
      })
      ids.push(id)
      addresses.push(wallet.address)
    } catch (err) {
      logger.error('wallet create insert failed', {
        address: wallet.address,
        error: String(err),
      })
      return {
        status: 400,
        body: {
          error: `Failed to save wallet ${i + 1}/${count}: ${err instanceof Error ? err.message : String(err)}`,
        },
      }
    }
  }

  logger.info('wallet create success', {
    wallet_type,
    count: ids.length,
    addresses: addresses.slice(0, 5),
  })
  return {
    status: 200,
    body: { created: ids.length, ids, addresses },
  }
}
