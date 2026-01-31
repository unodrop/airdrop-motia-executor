/**
 * Shared types: Wallet (Supabase), Pharos API payloads (replace with real API docs).
 *
 * 新钱包表结构 (wallets):
 * - id (uuid)
 * - address (text, unique)
 * - encrypted_private_key (text) — 存库均为加密，用 WALLET_KEY 解密
 * - is_enabled (boolean, default true) — 仅 is_enabled=true 参与签到
 * - created_at, updated_at (timestamptz)
 */

export type Wallet = {
  id: string
  address: string
  /** 加密私钥 (AES-256-GCM)，运行时用 WALLET_KEY 解密 */
  encrypted_private_key: string
  is_enabled: boolean
  /** 请求 Pharos 时使用的 User-Agent，无则需生成并写回 DB */
  user_agent?: string | null
  created_at?: string
  updated_at?: string
}

/** Pharos /user/login request body */
export type PharosLoginPayload = {
  address: string
  signature: string
  wallet?: string
  nonce: string
  chain_id: string
  timestamp: string
  domain: string
  invite_code?: string
}

/** Pharos /user/login response: { code, data: { jwt }, msg } */
export type PharosLoginResponse = {
  code: number
  data?: { jwt: string }
  msg?: string
}

/** Pharos POST /sign/in response: { code, msg }. code 0 = 成功，其他 = 失败 */
export type PharosSignInResponse = { code: number; msg?: string }

/** Pharos POST /faucet/daily response: { code, msg }. code !== 0 表示领水失败 */
export type PharosFaucetDailyResponse = { code: number; msg?: string }

/** Pharos GET /user/profile response: { code, data: { user_info }, msg } */
export type PharosProfileResponse = {
  code: number
  data?: { user_info: PharosUserInfo }
  msg?: string
}

export type PharosUserInfo = {
  ID?: number
  Address?: string
  XId?: string
  XHandle?: string
  TwitterAccessToken?: string
  DiscordId?: string
  UserName?: string
  Wallet?: string
  FatherAddress?: string
  GrandpaAddress?: string
  TotalPoints?: number
  TaskPoints?: number
  InvitePoints?: number
  IsKol?: boolean
  InviteCode?: string
  CreateTime?: string
  UpdateTime?: string
}
