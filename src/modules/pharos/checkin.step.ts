import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { JsonRpcProvider, parseEther, Wallet } from 'ethers'
import {
  getWalletById,
  updateWalletUserAgent,
} from '../../repositories/wallet.repository'
import * as ethereum from '../../services/ethereum'
import * as pharos from '../../services/pharos.client'
import { sendPharosFlowResult } from '../../services/notification'
import { decrypt } from '../../utils/wallet-crypto'
import { getRandomUserAgent } from '../../utils/ua'
import { getBalance, sendTransaction } from '../../utils/ethers'

const PHAROS_LOGIN_MESSAGE = 'pharos'
const PHAROS_CHAIN_ID = process.env.PHAROS_CHAIN_ID ?? '688689'
const PHAROS_DOMAIN = process.env.PHAROS_DOMAIN ?? 'testnet.pharosnetwork.xyz'
const PHAROS_VERIFY_TASK_ID = 401
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
    logger.warn(`Account not found `)
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
    logger.info(`Generated and saved UA for account `)
  }

  try {
    logger.info(`Pharos check-in: processing  address: ${wallet.address.slice(0, 10)}...`)

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
      domain: PHAROS_DOMAIN,
      ...(process.env.PHAROS_INVITE_CODE && { invite_code: process.env.PHAROS_INVITE_CODE }),
    }
    const pharosClient = new pharos.PharosClient(userAgent)
    const loginResponse = await pharosClient.login(loginPayload)
    logger.info(`Pharos login  ${JSON.stringify({ code: loginResponse.code, msg: loginResponse.msg })}`)
    const token = pharos.PharosClient.extractToken(loginResponse)

    let signInOk = false
    try {
      const signInRes = await pharosClient.signIn(token, wallet.address)
      signInOk = true
      logger.info(`Pharos 签到  ${JSON.stringify({ code: signInRes.code, msg: signInRes.msg })}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.warn(`Pharos 签到 failed address: ${wallet.address} msg: ${msg}`)
    }

    let points: number | undefined
    let hasBoundX = false
    try {
      const profileResponse = await pharosClient.getProfile(token, wallet.address)
      const userInfo = profileResponse.data?.user_info
      points = userInfo?.TotalPoints
      hasBoundX = Boolean(userInfo?.XId)
      logger.info(`Pharos profile  ${JSON.stringify({ code: profileResponse.code, msg: profileResponse.msg, points, hasBoundX })}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.warn(`Pharos profile failed address: ${wallet.address} msg: ${msg}`)
    }

    let claimOk: boolean | undefined
    if (hasBoundX) {
      try {
        const claimRes = await pharosClient.claimFaucetDaily(token, wallet.address)
        claimOk = true
        logger.info(`Pharos 领水  ${JSON.stringify({ code: claimRes.code, msg: claimRes.msg })}`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logger.warn(`Pharos 领水 failed address: ${wallet.address} msg: ${msg}`)
        claimOk = false
      }
    }

    let sendTxCount = 0
    let verifyOkCount = 0

    if (provider) {
      const balanceWei = await getBalance(wallet.address, provider)
      const amountWei = parseEther(SEND_AMOUNT_ETH)
      const recipients = Array.from({ length: MAX_SEND_RECIPIENTS }, () =>
        Wallet.createRandom().address
      )
      if (balanceWei >= amountWei) {
        for (const to of recipients) {
          if (sendTxCount >= MAX_SEND_RECIPIENTS) break
          try {
            const txResponse = await sendTransaction(to, amountWei, privateKey, provider)
            sendTxCount++
            const txHash = txResponse?.hash
            logger.info(`Send ETH  to:${to.slice(0, 10)}... amount: ${SEND_AMOUNT_ETH} txHash: ${txHash}`)
            if (txHash) {
              logger.info(`Waiting for tx confirmation  txHash: ${txHash}`)
              const receipt = await txResponse.wait(1)
              if (receipt) {
                logger.info(`Tx confirmed  txHash: ${txHash} blockNumber: ${receipt.blockNumber}`)
                const verifyRes = await pharosClient.verifyTask(
                  token,
                  { task_id: PHAROS_VERIFY_TASK_ID, address: wallet.address, tx_hash: txHash }
                )
                const verifySuccess = verifyRes.code === 0
                const verifyResult = {
                  success: verifySuccess,
                  code: verifyRes.code,
                  msg: verifyRes.msg,
                }
                logger.info(`验证结果  txHash: ${txHash} ${JSON.stringify(verifyResult)}`)
                if (verifySuccess) {
                  verifyOkCount++
                } else {
                  logger.warn(`验证任务未通过  txHash: ${txHash} ${JSON.stringify(verifyResult)}`)
                }
              } else {
                logger.warn(`Tx wait returned no receipt  txHash: ${txHash}`)
              }
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            logger.warn(`Send ETH failed address: ${wallet.address} to: ${to.slice(0, 10)}... msg: ${errMsg}`)
            break
          }
        }
        if (sendTxCount > 0) {
          logger.info(`Send ETH done  sendTxCount: ${sendTxCount} verifyOkCount: ${verifyOkCount}`)
        }
      }
    }

    // 签到、发交易、验证后重新拉取积分，保证上报的是最新值
    try {
      const profileRes = await pharosClient.getProfile(token, wallet.address)
      if (profileRes.code === 0 && profileRes.data?.user_info) {
        points = profileRes.data.user_info.TotalPoints
        logger.info(`Pharos profile（最新积分）  ${JSON.stringify({ points, msg: profileRes.msg })}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.warn(`Pharos profile（最新积分）failed address: ${wallet.address} msg: ${msg}`)
    }

    await sendPharosFlowResult({
      address: wallet.address,
      success: true,
      loginOk: true,
      signInOk,
      points,
      hasBoundX,
      claimOk,
      sendTxCount: sendTxCount > 0 ? sendTxCount : undefined,
      verifyOkCount: verifyOkCount > 0 ? verifyOkCount : undefined,
      verifyTotal: sendTxCount > 0 ? sendTxCount : undefined,
    }    ).catch((sendError) => {
      const msg = sendError instanceof Error ? sendError.message : String(sendError)
      logger.warn(`Send flow result failed msg: ${msg}`)
    })

    logger.info(`Pharos check-in done  ${JSON.stringify({ signInOk, hasBoundX, points, sendTxCount, verifyOkCount, traceId })}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error(`Pharos check-in failed address: ${wallet.address} traceId: ${traceId} msg: ${errMsg}`)
    await sendPharosFlowResult({
      address: wallet.address,
      success: false,
      error: errMsg,
    }).catch((sendError) => {
      const msg = sendError instanceof Error ? sendError.message : String(sendError)
      logger.warn(`Send flow result failed msg: ${msg}`)
    })
  }

  await new Promise<void>((resolve) => setTimeout(resolve, delayMillis))
}
