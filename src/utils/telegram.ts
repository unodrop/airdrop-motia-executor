/**
 * Reusable Telegram Bot API helpers. Use utils/http; only this module talks to Telegram.
 * Token from TELEGRAM_BOT_TOKEN; chatId can be from env (TELEGRAM_CHAT_ID) or passed in.
 */

import { post } from './http'

const TELEGRAM_BASE = 'https://api.telegram.org'

export type SendMessageOptions = {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disable_notification?: boolean
  disable_web_page_preview?: boolean
}

/**
 * Send a text message to a chat. Reusable for check-in results, alerts, logs, etc.
 * @param chatId - Telegram chat ID (e.g. from TELEGRAM_CHAT_ID or passed by caller)
 * @param text - Message text
 * @param options - Optional parse_mode, disable_notification, etc.
 */
export async function sendMessage(
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
  }

  await post<{ ok: boolean }>(
    `${TELEGRAM_BASE}/bot${token}/sendMessage`,
    {
      chat_id: chatId,
      text,
      ...options,
    },
    { baseURL: undefined }
  )
}

/**
 * Get default chat ID from env (e.g. for single-user bots).
 */
export function getDefaultChatId(): string | undefined {
  return process.env.TELEGRAM_CHAT_ID
}
