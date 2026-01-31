/**
 * 随机 User-Agent 生成，用于 Pharos 等请求。使用 random-useragent 库。
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const randomUseragent = require('random-useragent') as { getRandom: (filter?: (ua: unknown) => boolean) => string | null }

export function getRandomUserAgent(): string {
  const ua = randomUseragent.getRandom()
  if (typeof ua !== 'string' || !ua) {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
  return ua
}
