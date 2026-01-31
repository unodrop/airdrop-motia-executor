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
