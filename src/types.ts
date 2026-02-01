/**
 * Shared types: Wallet (Supabase), Pharos API payloads.
 *
 * 表 wallets 见 docs/wallets-schema.sql：
 * - id, address, private_key_encrypted, mnemonic_encrypted, user_agent, ...
 * - 应用层读 private_key_encrypted 作 encrypted_private_key；user_agent 明文存储
 */

export type Wallet = {
  id: string
  address: string
  /** 加密私钥（来自 DB private_key_encrypted），运行时用 ENCRYPTED_KEY 解密 */
  encrypted_private_key: string
  /** 请求 Pharos 时使用的 User-Agent（DB 明文存储），无则需生成并写回 DB */
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
  timestamp?: string
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

/** Pharos POST /task/verify request body */
export type PharosVerifyTaskPayload = {
  task_id: number
  address: string
  tx_hash: string
}

/** Pharos POST /task/verify response: { code, msg }. code 0 = 成功 */
export type PharosVerifyTaskResponse = { code: number; msg?: string }

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

/** 定投提醒：单标的分析结果 */
export type DCAAnalysisResult = {
  symbol: string
  /** 显示名称，如 黄金/纳指/标普 */
  label: string
  price: number
  ma20?: number
  ma60?: number
  rsi?: number
  /** 是否适合定投 */
  suitable: boolean
  /** 简短原因 */
  reason?: string
}

/** 定投提醒推送 payload（黄金单条 或 美股纳指+标普合并） */
export type DCAAlertPayload = {
  market: 'gold' | 'us'
  results: DCAAnalysisResult[]
}
