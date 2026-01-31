/**
 * Pharos API client: login, sign-in (签到), profile, 领水.
 * 所有请求均带完整 headers：accept, accept-language, content-type, origin, referer, user-agent；需登录的加 authorization.
 */

import { post, get } from '../utils/http'
import type {
  PharosLoginPayload,
  PharosLoginResponse,
  PharosSignInResponse,
  PharosProfileResponse,
  PharosFaucetDailyResponse,
} from '../types'

const apiBaseUrl = process.env.PHAROS_API_BASE ?? ''
const pharosOrigin = process.env.PHAROS_ORIGIN ?? 'https://testnet.pharosnetwork.xyz'

function apiRequestOptions() {
  return { baseURL: apiBaseUrl, timeoutMs: 15_000, retries: 1 }
}

/** 构建 Pharos 请求头：accept、accept-language、content-type、origin、referer、user-agent；有 token 时加 authorization */
function buildPharosHeaders(userAgent: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
    'content-type': 'application/json',
    origin: pharosOrigin,
    referer: `${pharosOrigin}/`,
    'user-agent': userAgent,
  }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * Login: POST /user/login. Returns { code, data: { jwt }, msg }. Throws if code !== 0.
 */
export async function login(
  payload: PharosLoginPayload,
  userAgent: string
): Promise<PharosLoginResponse> {
  const response = await post<PharosLoginResponse>(
    '/user/login',
    payload,
    {
      ...apiRequestOptions(),
      headers: buildPharosHeaders(userAgent),
    }
  )
  if (response.code !== 0) {
    throw new Error(`Pharos login failed: ${response.msg ?? response.code}`)
  }
  return response
}

/**
 * 签到: POST /sign/in，body { address }。code 0 = 成功，其他 = 失败。
 */
export async function signIn(
  token: string,
  address: string,
  userAgent: string
): Promise<PharosSignInResponse> {
  const response = await post<PharosSignInResponse>(
    '/sign/in',
    { address },
    {
      ...apiRequestOptions(),
      headers: buildPharosHeaders(userAgent, token),
    }
  )
  if (response.code !== 0) {
    throw new Error(`Pharos 签到 failed: ${response.msg ?? response.code}`)
  }
  return response
}

/**
 * Get user profile (includes TotalPoints, XId). GET /user/profile?address=<address>.
 */
export async function getProfile(
  token: string,
  address: string,
  userAgent: string
): Promise<PharosProfileResponse> {
  const response = await get<PharosProfileResponse>(
    `/user/profile?address=${encodeURIComponent(address)}`,
    {
      ...apiRequestOptions(),
      headers: buildPharosHeaders(userAgent, token),
    }
  )
  if (response.code !== 0) {
    throw new Error(`Pharos profile failed: ${response.msg ?? response.code}`)
  }
  return response
}

/**
 * 领水: POST /faucet/daily，body { address }。code !== 0 时抛错。
 */
export async function claimFaucetDaily(
  token: string,
  address: string,
  userAgent: string
): Promise<PharosFaucetDailyResponse> {
  const response = await post<PharosFaucetDailyResponse>(
    '/faucet/daily',
    { address },
    {
      ...apiRequestOptions(),
      headers: buildPharosHeaders(userAgent, token),
    }
  )
  if (response.code !== 0) {
    throw new Error(`Pharos 领水 failed: ${response.msg ?? response.code}`)
  }
  return response
}

/**
 * Extract JWT from login response (data.jwt).
 */
export function extractToken(loginResponse: PharosLoginResponse): string {
  const jwt = loginResponse.data?.jwt
  if (!jwt || typeof jwt !== 'string') {
    throw new Error('Pharos login response did not contain data.jwt')
  }
  return jwt
}
