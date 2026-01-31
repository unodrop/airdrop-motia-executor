import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { JsonRpcProvider, parseEther, Wallet } from 'ethers'
import {
  getWalletById,
  updateWalletUserAgent,
} from '../../repositories/wallet.repository'
import * as ethereum from '../../services/ethereum'
import * as pharos from '../../services/pharos.client'
import { sendCheckinResult } from '../../services/notification'
import { decrypt } from '../../utils/wallet-crypto'
import { getRandomUserAgent } from '../../utils/ua'
import { getBalance, sendTransaction } from '../../utils/ethers'

const PHAROS_LOGIN_MESSAGE = 'pharos'
const PHAROS_CHAIN_ID = process.env.PHAROS_CHAIN_ID ?? '688689'
const PHAROS_DOMAIN = process.env.PHAROS_DOMAIN ?? 'testnet.pharosnetwork.xyz'
const SEND_AMOUNT_ETH = '0.0001'
const MAX_SEND_RECIPIENTS = 10

export const config: EventConfig = {
  type: 'event',
  name: 'PharosCheckIn',
  description: 'Per account: sign → login → check-in → points → claim (领水) if bound X → notify',
  flows: ['pharos-checkin'],
  subscribes: ['pharos-checkin'],
  emits: [],
  input: z.object({
    id: z.string(),
  }),
  includeFiles: [
    '../repositories/wallet.repository.ts',
    '../services/ethereum.ts',
    '../services/pharos.client.ts',
    '../services/notification.ts',
    '../types.ts',
    '../utils/http.ts',
    '../utils/ethers.ts',
    '../utils/telegram.ts',
    '../utils/ua.ts',
    '../utils/wallet-crypto.ts',
  ],
}

export const handler: Handlers['PharosCheckIn'] = async (
  input,
  { logger, traceId }
) => {
  const { id } = input
  const wallet = await getWalletById(id)
  if (!wallet) {
    logger.warn('Account not found', { id })
    return
  }

  const decryptionKey = process.env.ENCRYPTED_KEY
  const privateKey = decryptionKey
    ? decrypt(wallet.encrypted_private_key, decryptionKey)
    : wallet.encrypted_private_key

  const delayMillis = Number(process.env.CHECKIN_DELAY_MS) || 5000

  let userAgent = wallet.user_agent
  if (!userAgent) {
    userAgent = getRandomUserAgent()
    await updateWalletUserAgent(wallet.id, userAgent)
    logger.info('Generated and saved UA for account', { id })
  }

  try {
    logger.info('Pharos check-in: processing', {
      id,
      addressPrefix: wallet.address.slice(0, 10) + '...',
    })

    const provider = process.env.PHAROS_RPC_URL
      ? new JsonRpcProvider(process.env.PHAROS_RPC_URL)
      : undefined
    const signature = await ethereum.signMessageForLogin(
      PHAROS_LOGIN_MESSAGE,
      privateKey,
      provider
    )
    const loginPayload = {
      address: wallet.address,
      signature,
      wallet: 'MetaMask',
      nonce: String(Date.now()),
      chain_id: PHAROS_CHAIN_ID,
      timestamp: new Date().toISOString(),
      domain: PHAROS_DOMAIN,
      ...(process.env.PHAROS_INVITE_CODE && { invite_code: process.env.PHAROS_INVITE_CODE }),
    }
    const loginResponse = await pharos.login(loginPayload, userAgent)
    const token = pharos.extractToken(loginResponse)

    await pharos.signIn(token, wallet.address, userAgent)
    const profileResponse = await pharos.getProfile(token, wallet.address, userAgent)
    const userInfo = profileResponse.data?.user_info
    const points = userInfo?.TotalPoints
    const hasBoundX = Boolean(userInfo?.XId)

    let claimSucceeded: boolean | undefined

    if (hasBoundX) {
      try {
        await pharos.claimFaucetDaily(token, wallet.address, userAgent)
        claimSucceeded = true
      } catch (error) {
        logger.warn('领水 failed', { id, error: String(error) })
        claimSucceeded = false
      }
    }

    const shouldNotify = !hasBoundX || claimSucceeded === true
    if (shouldNotify) {
      await sendCheckinResult({
        address: wallet.address,
        success: true,
        points,
        message: hasBoundX
          ? (claimSucceeded ? '领水 OK' : '领水 failed')
          : 'Check-in OK (X not bound)',
      })
    }

    if (provider) {
      const balanceWei = await getBalance(wallet.address, provider)
      const amountWei = parseEther(SEND_AMOUNT_ETH)
      const recipients = Array.from({ length: MAX_SEND_RECIPIENTS }, () =>
        Wallet.createRandom().address
      )
      if (balanceWei >= amountWei) {
        let sentCount = 0
        for (const to of recipients) {
          if (sentCount >= MAX_SEND_RECIPIENTS) break
          try {
            await sendTransaction(to, amountWei, privateKey, provider)
            sentCount++
            logger.info('Send ETH', { id, to: to.slice(0, 10) + '...', amount: SEND_AMOUNT_ETH })
          } catch (err) {
            logger.warn('Send ETH failed', { id, to: to.slice(0, 10) + '...', error: String(err) })
            break
          }
        }
        if (sentCount > 0) {
          logger.info('Send ETH done', { id, sentCount, amountPerRecipient: SEND_AMOUNT_ETH })
        }
      }
    }

    logger.info('Pharos check-in done', {
      id,
      hasBoundX,
      points,
      traceId,
    })
  } catch (error) {
    logger.error('Pharos check-in failed', {
      id,
      error: String(error),
      traceId,
    })
    await sendCheckinResult({
      address: wallet.address,
      success: false,
      message: String(error),
    }).catch((sendError) =>
      logger.warn('Send check-in result failed', { error: String(sendError) })
    )
  }

  await new Promise<void>((resolve) => setTimeout(resolve, delayMillis))
}
