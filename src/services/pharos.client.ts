/**
 * Pharos API client: login, sign-in (签到), profile, 领水, verifyTask.
 * 所有请求均带完整 headers：accept, accept-language, content-type, origin, referer, user-agent；需登录的加 authorization.
 */

import { post, get, HttpError } from '../utils/http'
import type {
  PharosLoginPayload,
  PharosLoginResponse,
  PharosSignInResponse,
  PharosProfileResponse,
  PharosFaucetDailyResponse,
  PharosVerifyTaskPayload,
  PharosVerifyTaskResponse,
} from '../types'

const DEFAULT_ORIGIN = 'https://testnet.pharosnetwork.xyz'

export class PharosClient {
  private readonly baseURL: string
  private readonly origin: string
  private readonly userAgent: string

  constructor(userAgent: string) {
    this.userAgent = userAgent
    this.baseURL = process.env.PHAROS_API_BASE ?? ''
    const domain = process.env.PHAROS_DOMAIN
    this.origin = domain
      ? `https://${domain.replace(/^https?:\/\//, '')}`
      : DEFAULT_ORIGIN
  }

  private requestOptions(token?: string) {
    const headers: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
      'content-type': 'application/json',
      origin: this.origin,
      referer: `${this.origin}/`,
      'user-agent': this.userAgent,
    }
    if (token) headers.authorization = `Bearer ${token}`
    return {
      baseURL: this.baseURL,
      timeoutMs: 15_000,
      retries: 1,
      headers,
    }
  }

  private wrapError(op: string, err: unknown): never {
    if (err instanceof HttpError) {
      const bodyStr = err.body != null ? ` | body: ${JSON.stringify(err.body)}` : ''
      throw new Error(`${op}: ${err.message}${bodyStr}`)
    }
    throw err
  }

  private async post<T>(op: string, path: string, body: unknown, token?: string): Promise<T> {
    try {
      return await post<T>(path, body, { ...this.requestOptions(token) })
    } catch (err) {
      this.wrapError(op, err)
    }
  }

  private async get<T>(op: string, path: string, token?: string): Promise<T> {
    try {
      return await get<T>(path, { ...this.requestOptions(token) })
    } catch (err) {
      this.wrapError(op, err)
    }
  }

  /** Login: POST /user/login. Returns { code, data: { jwt }, msg }. Throws if code !== 0，仅抛 API msg/code，由调用方统一打日志。 */
  async login(payload: PharosLoginPayload): Promise<PharosLoginResponse> {
    const res = await this.post<PharosLoginResponse>('Pharos login', '/user/login', payload)
    if (res.code !== 0) throw new Error(String(res.msg ?? res.code))
    return res
  }

  /** 签到: POST /sign/in，body { address }. code 0 = 成功。抛 API msg/code。 */
  async signIn(token: string, address: string): Promise<PharosSignInResponse> {
    const res = await this.post<PharosSignInResponse>('Pharos 签到', '/sign/in', { address }, token)
    if (res.code !== 0) throw new Error(String(res.msg ?? res.code))
    return res
  }

  /** Get user profile. GET /user/profile?address=<address>。抛 API msg/code。 */
  async getProfile(token: string, address: string): Promise<PharosProfileResponse> {
    const res = await this.get<PharosProfileResponse>(
      'Pharos profile',
      `/user/profile?address=${encodeURIComponent(address)}`,
      token
    )
    if (res.code !== 0) throw new Error(String(res.msg ?? res.code))
    return res
  }

  /** 领水: POST /faucet/daily，body { address }。抛 API msg/code。 */
  async claimFaucetDaily(token: string, address: string): Promise<PharosFaucetDailyResponse> {
    const res = await this.post<PharosFaucetDailyResponse>(
      'Pharos 领水',
      '/faucet/daily',
      { address },
      token
    )
    if (res.code !== 0) throw new Error(String(res.msg ?? res.code))
    return res
  }

  /** 任务验证: POST /task/verify. code 0 = 成功 */
  async verifyTask(
    token: string,
    payload: PharosVerifyTaskPayload
  ): Promise<PharosVerifyTaskResponse> {
    return this.post<PharosVerifyTaskResponse>('Pharos verifyTask', '/task/verify', payload, token)
  }

  /** 从 login 响应中取出 JWT */
  static extractToken(loginResponse: PharosLoginResponse): string {
    const jwt = loginResponse.data?.jwt
    if (!jwt || typeof jwt !== 'string') {
      throw new Error('Pharos login response did not contain data.jwt')
    }
    return jwt
  }
}
