/**
 * Send check-in result (and other notifications). Uses utils/telegram.
 */

import { sendMessage, getDefaultChatId } from '../utils/telegram'

export type CheckinResultPayload = {
  address: string
  success: boolean
  message?: string
  points?: number
}

/** 全流程合并消息：登录、签到、领水、发交易、验证任务 */
export type PharosFlowResultPayload = {
  address: string
  success: boolean
  /** 失败时的错误信息 */
  error?: string
  /** 登录 */
  loginOk?: boolean
  /** 签到 */
  signInOk?: boolean
  /** 积分 */
  points?: number
  /** 是否绑定 X */
  hasBoundX?: boolean
  /** 领水结果：true=成功 false=失败 undefined=未执行(未绑定) */
  claimOk?: boolean
  /** 发送交易笔数 */
  sendTxCount?: number
  /** 验证任务成功数 */
  verifyOkCount?: number
  /** 验证任务总数（与 sendTxCount 一致） */
  verifyTotal?: number
}

/**
 * Send check-in result to Telegram. Uses TELEGRAM_CHAT_ID if chatId not provided.
 */
export async function sendCheckinResult(
  payload: CheckinResultPayload,
  chatId?: string
): Promise<void> {
  const targetChatId = chatId ?? getDefaultChatId()
  if (!targetChatId) {
    throw new Error('TELEGRAM_CHAT_ID is not set and no chatId was passed')
  }

  const lines = [
    `Check-in: ${payload.success ? 'OK' : 'Failed'}`,
    `Address: ${payload.address.slice(0, 10)}...`,
  ]
  if (payload.points != null) lines.push(`Points: ${payload.points}`)
  if (payload.message) lines.push(payload.message)

  await sendMessage(targetChatId, lines.join('\n'), { parse_mode: undefined })
}

/**
 * 发送 Pharos 全流程结果（一条合并消息）。流程全部跑完后调用。
 */
export async function sendPharosFlowResult(
  payload: PharosFlowResultPayload,
  chatId?: string
): Promise<void> {
  const targetChatId = chatId ?? getDefaultChatId()
  if (!targetChatId) {
    throw new Error('TELEGRAM_CHAT_ID is not set and no chatId was passed')
  }

  const shortAddr = `${payload.address.slice(0, 10)}...${payload.address.slice(-6)}`
  const lines: string[] = [
    `Pharos 流程: ${payload.success ? '完成' : '失败'}`,
    `Address: ${shortAddr}`,
  ]
  if (payload.error) {
    lines.push(`错误: ${payload.error}`)
  } else {
    if (payload.loginOk != null) lines.push(`登录: ${payload.loginOk ? 'OK' : '失败'}`)
    if (payload.signInOk != null) lines.push(`签到: ${payload.signInOk ? 'OK' : '失败'}`)
    if (payload.points != null) lines.push(`积分: ${payload.points}`)
    if (payload.hasBoundX != null) {
      if (payload.hasBoundX) {
        lines.push(`领水: ${payload.claimOk === true ? 'OK' : payload.claimOk === false ? '失败' : '-'}`)
      } else {
        lines.push('领水: 未绑定 X')
      }
    }
    if (payload.sendTxCount != null && payload.sendTxCount > 0) {
      lines.push(`发送交易: ${payload.sendTxCount} 笔`)
      if (payload.verifyTotal != null && payload.verifyOkCount != null) {
        lines.push(`验证任务: ${payload.verifyOkCount}/${payload.verifyTotal} 成功`)
      }
    }
  }

  await sendMessage(targetChatId, lines.join('\n'), { parse_mode: undefined })
}
